import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Hall {
  id: string;
  name: string;
  block: string;
  type: string;
  capacity: number;
}

interface BookingFormProps {
  hall: Hall;
  onClose: () => void;
  onSuccess: () => void;
}

const BookingForm = ({ hall, onClose, onSuccess }: BookingFormProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    organizerName: '',
    facultyName: '',
    facultyPhone: '',
    institutionType: '',
    guestLecturesCount: 0,
    guestLectureNames: '',
    eventName: '',
    description: '',
    eventDate: '',
    startTime: '',
    endTime: '',
    attendeesCount: 0,
    requiredAC: false,
    requiredMic: false,
    requiredProjector: false,
    requiredAudioSystem: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('bookings').insert({
        faculty_id: profile.id,
        hall_id: hall.id,
        faculty_name: formData.facultyName || profile.name,
        faculty_phone: formData.facultyPhone || (profile as any)?.mobile_number,
        organizer_name: formData.organizerName,
        institution_type: formData.institutionType as any,
        guest_lectures_count: formData.guestLecturesCount,
        guest_lecture_names: formData.guestLectureNames,
        event_name: formData.eventName,
        description: formData.description,
        department: profile.department!,
        hod_name: 'Auto-filled HOD',
        event_date: formData.eventDate,
        start_time: formData.startTime,
        end_time: formData.endTime,
        attendees_count: formData.attendeesCount,
        required_ac: formData.requiredAC,
        required_mic: formData.requiredMic,
        required_projector: formData.requiredProjector,
        required_audio_system: formData.requiredAudioSystem
      });

      if (error) throw error;
      onSuccess();
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
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book {hall.name}</DialogTitle>
          <DialogDescription>
            Provide event details and equipment needs. HOD, Principal and PRO will see this request.
          </DialogDescription>
          <Button variant="ghost" size="sm" onClick={onClose} className="absolute right-4 top-4">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Organizer Name</Label>
              <Input
                value={formData.organizerName}
                onChange={(e) => setFormData({ ...formData, organizerName: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Institution Type</Label>
              <Select value={formData.institutionType} onValueChange={(value) => setFormData({ ...formData, institutionType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select institution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="School">School</SelectItem>
                  <SelectItem value="Diploma">Diploma</SelectItem>
                  <SelectItem value="Polytechnic">Polytechnic</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Event Name</Label>
              <Input
                value={formData.eventName}
                onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>No. of Attendees</Label>
              <Input
                type="number"
                value={formData.attendeesCount}
                onChange={(e) => setFormData({ ...formData, attendeesCount: parseInt(e.target.value) || 0 })}
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description about the event"
                rows={3}
                required
              />
            </div>

            <div>
              <Label>Faculty Name</Label>
              <Input
                value={formData.facultyName || profile?.name || ''}
                onChange={(e) => setFormData({ ...formData, facultyName: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Faculty Phone Number</Label>
              <Input
                type="tel"
                value={formData.facultyPhone || (profile?.mobile_number ?? '')}
                onChange={(e) => setFormData({ ...formData, facultyPhone: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Event Date</Label>
              <Input
                type="date"
                value={formData.eventDate}
                onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label>No. of Guest Lecturers</Label>
              <Input
                type="number"
                value={formData.guestLecturesCount}
                onChange={(e) => setFormData({ ...formData, guestLecturesCount: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Guest Lecturer Names</Label>
              <Input
                value={formData.guestLectureNames}
                onChange={(e) => setFormData({ ...formData, guestLectureNames: e.target.value })}
                placeholder="Comma separated names (optional)"
              />
            </div>
          </div>

          <div>
            <Label>Required Systems</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.requiredAC}
                  onCheckedChange={(checked) => setFormData({...formData, requiredAC: !!checked})}
                />
                <Label>AC</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.requiredMic}
                  onCheckedChange={(checked) => setFormData({...formData, requiredMic: !!checked})}
                />
                <Label>Microphone</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.requiredProjector}
                  onCheckedChange={(checked) => setFormData({...formData, requiredProjector: !!checked})}
                />
                <Label>Projector</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.requiredAudioSystem}
                  onCheckedChange={(checked) => setFormData({...formData, requiredAudioSystem: !!checked})}
                />
                <Label>Audio System</Label>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Submitting..." : "Submit Booking Request"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BookingForm;