import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Clock, Users, MapPin, CheckCircle, XCircle, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Booking {
  id: string;
  faculty_name: string;
  organizer_name: string;
  institution_type: string;
  guest_lectures_count: number;
  guest_lecture_names?: string;
  event_name: string;
  department: string;
  hod_name: string;
  event_date: string;
  start_time: string;
  end_time: string;
  attendees_count: number;
  student_years?: string[];
  required_ac: boolean;
  required_mic: boolean;
  required_projector: boolean;
  required_audio_system: boolean;
  status: string;
  rejection_reason?: string;
  created_at: string;
  halls?: { name: string; block: string; type: string; capacity: number };
}

interface BookingCardProps {
  booking: Booking;
  onStatusUpdate?: () => void;
  showActions?: boolean;
  userRole?: string;
}

const BookingCard = ({ booking, onStatusUpdate, showActions = false, userRole }: BookingCardProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_hod': return 'bg-yellow-500';
      case 'pending_principal': return 'bg-blue-500';
      case 'pending_pro': return 'bg-purple-500';
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_hod': return 'Pending HOD Approval';
      case 'pending_principal': return 'Pending Principal Approval';
      case 'pending_pro': return 'Pending PRO Approval';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending_hod': return 'pending_principal';
      case 'pending_principal': return 'pending_pro';
      case 'pending_pro': return 'approved';
      default: return currentStatus;
    }
  };

  const handleApprove = async () => {
    if (!profile) return;
    setLoading(true);

    try {
      const nextStatus = getNextStatus(booking.status);
      
      // Update booking status
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ status: nextStatus as any })
        .eq('id', booking.id);

      if (bookingError) throw bookingError;

      // Record approval
      const { error: approvalError } = await supabase
        .from('booking_approvals')
        .insert({
          booking_id: booking.id,
          approver_id: profile.id,
          action: 'approved'
        });

      if (approvalError) throw approvalError;

      toast({
        title: "Success",
        description: "Booking approved successfully",
        variant: "default"
      });
      
      onStatusUpdate?.();
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

  const handleReject = async () => {
    if (!profile || !rejectionReason.trim()) return;
    setLoading(true);

    try {
      // Update booking status and rejection reason
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ 
          status: 'rejected',
          rejection_reason: rejectionReason 
        })
        .eq('id', booking.id);

      if (bookingError) throw bookingError;

      // Record rejection
      const { error: approvalError } = await supabase
        .from('booking_approvals')
        .insert({
          booking_id: booking.id,
          approver_id: profile.id,
          action: 'rejected',
          reason: rejectionReason
        });

      if (approvalError) throw approvalError;

      toast({
        title: "Booking Rejected",
        description: "Rejection reason has been sent to faculty",
        variant: "default"
      });
      
      setShowRejectDialog(false);
      setRejectionReason("");
      onStatusUpdate?.();
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

  const canApprove = () => {
    if (!userRole || !profile) return false;
    
    switch (booking.status) {
      case 'pending_hod':
        return userRole === 'hod' && profile.department === booking.department;
      case 'pending_principal':
        return userRole === 'principal';
      case 'pending_pro':
        return userRole === 'pro';
      default:
        return false;
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{booking.event_name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Organized by {booking.organizer_name} • {booking.faculty_name}
            </p>
          </div>
          <Badge className={`${getStatusColor(booking.status)} text-white`}>
            {getStatusText(booking.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{booking.attendees_count} attendees</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{booking.department} Department</span>
          </div>
        </div>

        {booking.halls && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">{booking.halls.name}</p>
            <p className="text-sm text-muted-foreground">
              {booking.halls.block} • {booking.halls.type} • Capacity: {booking.halls.capacity}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {booking.required_ac && <Badge variant="outline">AC Required</Badge>}
          {booking.required_mic && <Badge variant="outline">Microphone</Badge>}
          {booking.required_projector && <Badge variant="outline">Projector</Badge>}
          {booking.required_audio_system && <Badge variant="outline">Audio System</Badge>}
        </div>

        {booking.rejection_reason && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm font-medium text-destructive">Rejection Reason:</p>
            <p className="text-sm">{booking.rejection_reason}</p>
          </div>
        )}

        {showActions && canApprove() && (
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleApprove} disabled={loading} className="flex-1">
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="flex-1">
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reject Booking</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Please provide a reason for rejecting this booking request:
                  </p>
                  <Textarea
                    placeholder="Enter rejection reason..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button 
                      variant="destructive" 
                      onClick={handleReject}
                      disabled={loading || !rejectionReason.trim()}
                      className="flex-1"
                    >
                      {loading ? "Rejecting..." : "Confirm Rejection"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowRejectDialog(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium">Institution Type</p>
                  <p className="text-sm text-muted-foreground">{booking.institution_type}</p>
                </div>
                <div>
                  <p className="font-medium">Guest Lectures</p>
                  <p className="text-sm text-muted-foreground">{booking.guest_lectures_count}</p>
                </div>
              </div>
              {booking.guest_lecture_names && (
                <div>
                  <p className="font-medium">Guest Lecturers</p>
                  <p className="text-sm text-muted-foreground">{booking.guest_lecture_names}</p>
                </div>
              )}
              {booking.student_years && booking.student_years.length > 0 && (
                <div>
                  <p className="font-medium">Student Years</p>
                  <div className="flex gap-2 mt-1">
                    {booking.student_years.map(year => (
                      <Badge key={year} variant="outline">{year}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="font-medium">HOD Name</p>
                <p className="text-sm text-muted-foreground">{booking.hod_name}</p>
              </div>
              <div>
                <p className="font-medium">Requested Date</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(booking.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default BookingCard;