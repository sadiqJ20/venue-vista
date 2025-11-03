import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Clock, Users, MapPin, CheckCircle, XCircle, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useEmailNotifications } from "@/hooks/useEmailNotifications";
import { sendBookingNotification } from "@/lib/emailNotifications";
import type { Database } from "@/integrations/supabase/types";

interface Booking {
  id: string;
  faculty_id?: string;
  faculty_name: string;
  faculty_phone?: string;
  organizer_name: string;
  institution_type: string;
  guest_lectures_count: number;
  guest_lecture_names?: string;
  event_name: string;
  description?: string;
  department: string;
  hod_id?: string;
  hod_name: string;
  event_date: string;
  start_time: string;
  end_time: string;
  attendees_count: number;
  required_ac: boolean;
  required_mic: boolean;
  required_projector: boolean;
  required_audio_system: boolean;
  status: string;
  rejection_reason?: string;
  created_at: string;
  halls?: {
    id: string;
    name: string;
    block: string;
    type: string;
    capacity: number;
    has_ac?: boolean;
    has_mic?: boolean;
    has_projector?: boolean;
    has_audio_system?: boolean;
  };
  hall_name?: string; // Fallback if halls is not available
}

interface BookingCardProps {
  booking: Booking;
  onStatusUpdate?: () => void;
  showActions?: boolean;
  userRole?: string;
}

const BookingCard = ({ booking, onStatusUpdate, showActions = false, userRole }: BookingCardProps) => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const { notifyPrincipalApproval, notifyPROApproval, notifyFacultyFinalApproval, notifyFacultyRejection } = useEmailNotifications();
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  // HOD name is still maintained in state for backend use, but not displayed in UI
  const [hodName, setHodName] = useState(booking.hod_name || "");

  useEffect(() => {
    const updateHodName = async () => {
      // If we have a HOD name, use it
      if (booking?.hod_name) {
        setHodName(booking.hod_name);
        return;
      }
      
      // If no HOD name is set, try to get it from the department's HOD
      if (booking?.department) {
        try {
          // Find the HOD for this department
          const { data: hodData, error } = await supabase
            .from('profiles')
            .select('name, id')
            .eq('department', booking.department)
            .eq('role', 'hod')
            .single();

          if (error) throw error;

          if (hodData?.name) {
            setHodName(hodData.name);
            
            // Update the booking record with the HOD name for backend reference
            if (booking.id) {
              await supabase
                .from('bookings')
                .update({ 
                  hod_name: hodData.name,
                  // Don't update hod_id as it's no longer in the schema
                })
                .eq('id', booking.id);
            }
          }
        } catch (error) {
          console.error("Error updating HOD name in backend:", error);
        }
      }
    };

    updateHodName();
  }, [booking?.id, booking?.department, booking?.hod_name]);

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
      case 'pending_hod': return 'pending_principal' as const;
      case 'pending_principal': return 'approved' as const; // Principal is now final approver
      case 'pending_pro': return 'approved' as const; // Keep for backward compatibility
      default: return currentStatus as any;
    }
  };

  const handleApprove = async () => {
    if (!profile) return;
    setLoading(true);

    try {
      const nextStatus = getNextStatus(booking.status);
      console.log(`Approving booking ${booking.id} from ${booking.status} to ${nextStatus}`);
      
      // Update booking status and set HOD details if approved by HOD
      const updateData: any = { status: nextStatus };
      
      // If this is a HOD approval, ensure we have the HOD name
      if (profile.role === 'hod' && !booking.hod_name) {
        updateData.hod_name = profile.name || 'HOD';
      }
      
      const { error: bookingError } = await supabase
        .from('bookings')
        .update(updateData)
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

      console.log(`Booking ${booking.id} approved successfully`);
      
      // Send email notification using unified function
      try {
        const actionBy = profile.role === 'hod' ? 'HOD' : profile.role === 'principal' ? 'Principal' : 'PRO';
        // Treat approvals as an "Approved" decision for routing to next role
        const status = 'Approved';
        console.log('Approval email routing context:', { bookingId: booking.id, actionBy, status, nextStatus });
        await sendBookingNotification(booking, actionBy, status);
      } catch (emailError) {
        console.error('Email notification error:', emailError);
        // Don't fail the approval if email fails
      }
      
      toast({
        title: "Success",
        description: "Booking approved successfully",
        variant: "default"
      });
      
      onStatusUpdate?.();
    } catch (error: any) {
      console.error('Approval error:', error);
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
      console.log(`Rejecting booking ${booking.id} with reason: ${rejectionReason}`);
      
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

      console.log(`Booking ${booking.id} rejected successfully`);
      
      // Send rejection notification using unified function
      try {
        const actionBy = profile.role === 'hod' ? 'HOD' : profile.role === 'principal' ? 'Principal' : 'PRO';
        const status = 'Rejected';
        console.log('Rejection email routing context:', { bookingId: booking.id, actionBy, status, rejectionReason });
        await sendBookingNotification(booking, actionBy, status, rejectionReason);
      } catch (emailError) {
        console.error('Email notification error:', emailError);
        // Don't fail the rejection if email fails
      }
      
      toast({
        title: "Booking Rejected",
        description: "Rejection reason has been sent to faculty",
        variant: "default"
      });
      
      setShowRejectDialog(false);
      setRejectionReason("");
      onStatusUpdate?.();
    } catch (error: any) {
      console.error('Rejection error:', error);
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
    if (!userRole) return false;
    
    switch (booking.status) {
      case 'pending_hod':
        return userRole === 'hod' && profile?.department === booking.department;
      case 'pending_principal':
        return userRole === 'principal'; // Principal can approve from any department
      case 'pending_pro':
        return false; // PRO can no longer approve - Principal is final approver
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

        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium">
            {booking.halls?.name || booking.hall_name || 'Venue not specified'}
          </p>
          {booking.halls && (
            <p className="text-sm text-muted-foreground">
              {booking.halls.block ? `${booking.halls.block} • ` : ''}
              {booking.halls.type ? `${booking.halls.type} • ` : ''}
              {booking.halls.capacity ? `Capacity: ${booking.halls.capacity}` : ''}
            </p>
          )}
        </div>

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
          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
            <Button onClick={handleApprove} disabled={loading} variant="outline" className="w-full sm:w-auto border border-green-500 text-green-600 hover:bg-green-50 hover:border-green-600 hover:text-green-700 transition-colors">
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto border border-red-500 text-red-600 hover:bg-red-50 hover:border-red-600 hover:text-red-700 transition-colors">
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
                      className="flex-1 hover:bg-red-600 hover:text-white"
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
          <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader className="px-1">
              <div className="flex flex-col space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <DialogTitle className="text-2xl font-bold text-foreground">Booking Details</DialogTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge className={`${getStatusColor(booking.status)} text-white`}>
                      {getStatusText(booking.status)}
                    </Badge>
                  </div>
                </div>
                <div className="h-px bg-border w-full" />
              </div>
            </DialogHeader>

            <div className="space-y-6 py-2 px-1">
              {/* Institution & Event Details */}
              <section className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground/90 pb-1 border-b border-border">Institution & Event Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Institution Type</p>
                    <p className="text-base font-medium">{booking.institution_type}</p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Event Name</p>
                    <p className="text-base font-medium">{booking.event_name}</p>
                  </div>
                  {booking.description && (
                    <div className="md:col-span-2 bg-muted/30 p-4 rounded-lg border border-border">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Event Description</p>
                      <p className="text-base whitespace-pre-wrap">{booking.description}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Contact Information */}
              <section className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground/90 pb-1 border-b border-border">Contact Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Organizer Name</p>
                    <p className="text-base">{booking.organizer_name}</p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Faculty Name</p>
                    <p className="text-base">{booking.faculty_name}</p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Faculty Phone</p>
                    <p className="text-base">{booking.faculty_phone || 'Not provided'}</p>
                  </div>
                </div>
              </section>

              {/* Event Schedule */}
              <section className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground/90 pb-1 border-b border-border">Event Schedule</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Event Date</p>
                    <p className="text-base">
                      {new Date(booking.event_date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Start Time</p>
                    <p className="text-base">{booking.start_time}</p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <p className="text-sm font-medium text-muted-foreground mb-1">End Time</p>
                    <p className="text-base">{booking.end_time}</p>
                  </div>
                </div>
              </section>

              {/* Additional Information */}
              <section className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground/90 pb-1 border-b border-border">Additional Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Number of Attendees</p>
                    <p className="text-base">{booking.attendees_count}</p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Department</p>
                    <p className="text-base">{booking.department}</p>
                  </div>
                  {booking.guest_lectures_count > 0 && (
                    <div className="bg-muted/30 p-4 rounded-lg border border-border">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Guest Lectures</p>
                      <p className="text-base">{booking.guest_lectures_count}</p>
                    </div>
                  )}
                  {booking.guest_lecture_names && (
                    <div className="sm:col-span-2 bg-muted/30 p-4 rounded-lg border border-border">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Guest Lecturers</p>
                      <div className="bg-background/50 p-3 rounded-md">
                        <p className="text-base whitespace-pre-wrap break-words">{booking.guest_lecture_names}</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Equipment Requirements */}
              {(booking.required_ac || booking.required_mic || booking.required_projector || booking.required_audio_system) && (
                <section className="space-y-3">
                  <h3 className="text-lg font-semibold text-foreground/90 pb-1 border-b border-border">Equipment Requirements</h3>
                  <div className="flex flex-wrap gap-2 bg-muted/30 p-4 rounded-lg border border-border">
                    {booking.required_ac && <Badge variant="outline" className="text-sm bg-background">Air Conditioning</Badge>}
                    {booking.required_mic && <Badge variant="outline" className="text-sm bg-background">Microphone</Badge>}
                    {booking.required_projector && <Badge variant="outline" className="text-sm bg-background">Projector</Badge>}
                    {booking.required_audio_system && <Badge variant="outline" className="text-sm bg-background">Audio System</Badge>}
                  </div>
                </section>
              )}

              {/* Hall Information */}
              <section className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground/90 pb-1 border-b border-border">Venue Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Venue</p>
                    <p className="text-base">
                      {booking.halls?.name || booking.hall_name || 'Not specified'}
                    </p>
                  </div>
                  {booking.halls?.block && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Block</p>
                      <p className="text-base">{booking.halls.block}</p>
                    </div>
                  )}
                  {booking.halls?.type && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Venue Type</p>
                      <p className="text-base capitalize">
                        {typeof booking.halls.type === 'string' ? booking.halls.type.toLowerCase() : 'N/A'}
                      </p>
                    </div>
                  )}
                  {booking.halls?.capacity && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Capacity</p>
                      <p className="text-base">{booking.halls.capacity} people</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Metadata */}
              <div className="pt-2 text-xs text-muted-foreground border-t border-border mt-6">
                <p>Booking created on {new Date(booking.created_at).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default BookingCard;