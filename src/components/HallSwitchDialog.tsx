import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Hall {
  id: string;
  name: string;
  block: string;
  type: string;
  capacity: number;
  has_ac: boolean;
  has_mic: boolean;
  has_projector: boolean;
  has_audio_system: boolean;
}

interface Booking {
  id: string;
  event_name: string;
  event_date: string;
  start_time: string;
  end_time: string;
  hall_id: string;
  halls: Hall;
}

interface HallSwitchDialogProps {
  booking: Booking;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const HallSwitchDialog = ({ booking, open, onClose, onSuccess }: HallSwitchDialogProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [availableHalls, setAvailableHalls] = useState<Hall[]>([]);
  const [selectedHallId, setSelectedHallId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingHalls, setFetchingHalls] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAvailableHalls();
    }
  }, [open, booking]);

  const fetchAvailableHalls = async () => {
    setFetchingHalls(true);
    try {
      // Get all halls
      const { data: allHalls, error: hallsError } = await supabase
        .from('halls')
        .select('*')
        .neq('id', booking.hall_id) // Exclude current hall
        .order('name');

      if (hallsError) throw hallsError;

      // Check availability for each hall
      const available: Hall[] = [];
      for (const hall of allHalls || []) {
        const { data: isAvailable, error } = await supabase.rpc('is_hall_available', {
          hall_id_param: hall.id,
          event_date_param: booking.event_date,
          start_time_param: booking.start_time,
          end_time_param: booking.end_time,
          exclude_booking_id: booking.id
        });

        if (!error && isAvailable) {
          available.push(hall);
        }
      }

      setAvailableHalls(available);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch available halls",
        variant: "destructive"
      });
    } finally {
      setFetchingHalls(false);
    }
  };

  const handleSwitch = async () => {
    if (!selectedHallId || !reason.trim() || !profile) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          hall_id: selectedHallId,
          original_hall_id: booking.hall_id,
          hall_changed_by: profile.id,
          hall_change_reason: reason
        })
        .eq('id', booking.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Hall switched successfully. Faculty has been notified.",
        variant: "default"
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Switch Hall for Booking</DialogTitle>
          <DialogDescription>
            Move this booking to a different available hall
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Booking Info */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-3">Current Booking</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{new Date(booking.event_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.start_time} - {booking.end_time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.halls.name} ({booking.halls.block})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Capacity: {booking.halls.capacity}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hall Selection */}
          <div className="space-y-4">
            <Label>Select New Hall</Label>
            {fetchingHalls ? (
              <div className="text-center py-4 text-muted-foreground">
                Checking hall availability...
              </div>
            ) : availableHalls.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No available halls found for this time slot
              </div>
            ) : (
              <Select value={selectedHallId} onValueChange={setSelectedHallId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an available hall" />
                </SelectTrigger>
                <SelectContent>
                  {availableHalls.map((hall) => (
                    <SelectItem key={hall.id} value={hall.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{hall.name} - {hall.block}</span>
                        <div className="flex gap-1 ml-2">
                          {hall.has_ac && <Badge variant="outline" className="text-xs">AC</Badge>}
                          {hall.has_mic && <Badge variant="outline" className="text-xs">Mic</Badge>}
                          {hall.has_projector && <Badge variant="outline" className="text-xs">Proj</Badge>}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Selected Hall Details */}
          {selectedHallId && (
            <Card>
              <CardContent className="p-4">
                {(() => {
                  const selectedHall = availableHalls.find(h => h.id === selectedHallId);
                  if (!selectedHall) return null;
                  return (
                    <div>
                      <h3 className="font-medium mb-3">New Hall Details</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedHall.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>Capacity: {selectedHall.capacity}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {selectedHall.has_ac && <Badge variant="secondary">AC</Badge>}
                        {selectedHall.has_mic && <Badge variant="secondary">Microphone</Badge>}
                        {selectedHall.has_projector && <Badge variant="secondary">Projector</Badge>}
                        {selectedHall.has_audio_system && <Badge variant="secondary">Audio System</Badge>}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason for Hall Change</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a reason for switching halls..."
              rows={3}
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleSwitch}
              disabled={!selectedHallId || !reason.trim() || loading || fetchingHalls}
              className="flex-1"
            >
              {loading ? "Switching..." : "Switch Hall"}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HallSwitchDialog;