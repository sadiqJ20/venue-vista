import { supabase } from "@/integrations/supabase/client";
import { sendTestEmail } from "@/integrations/emailjs/sendTestEmail";

/**
 * Unified function to send booking notifications via EmailJS using the
 * same variables the templates expect. Also persists a log row optionally.
 *
 * actionBy: who performed action (Faculty/HOD/Principal/PRO)
 * status: "Pending" | "Approved" | "Rejected"
 */
export async function sendBookingNotification(
  booking: any,
  actionBy: "Faculty" | "HOD" | "Principal" | "PRO",
  status: "Pending" | "Approved" | "Rejected",
  rejectionReason?: string
): Promise<boolean> {
  try {
    // Look up emails for recipients based on workflow stage
    // For simplicity, always email the next approver or the faculty on final states.
    let recipientEmail = "";
    if (status === "Pending") {
      // Notify HOD for department
      const { data } = await supabase
        .from("profiles")
        .select("email")
        .eq("role", "hod")
        .eq("department", booking.department)
        .maybeSingle();
      recipientEmail = data?.email || "";
    } else if (status === "Approved") {
      // Route to next approver based on actionBy
      if (actionBy === "HOD") {
        // Notify Principal
        const { data } = await supabase.from("profiles").select("email").eq("role", "principal").maybeSingle();
        recipientEmail = data?.email || "";
      } else if (actionBy === "Principal") {
        // Notify PRO for final approval
        const { data } = await supabase.from("profiles").select("email").eq("role", "pro").maybeSingle();
        recipientEmail = data?.email || "";
      } else if (actionBy === "PRO") {
        // Get faculty email to notify final approval
        if (booking.faculty_id) {
          const { data } = await supabase.from("profiles").select("email").eq("id", booking.faculty_id).maybeSingle();
          recipientEmail = data?.email || "";
        }
      }
    } else if (status === "Rejected") {
      // Notify faculty on rejection
      if (booking.faculty_id) {
        const { data } = await supabase.from("profiles").select("email").eq("id", booking.faculty_id).maybeSingle();
        recipientEmail = data?.email || "";
      }
    }

    if (!recipientEmail) {
      console.warn("sendBookingNotification: No recipient email resolved", { status, actionBy, bookingId: booking?.id, faculty_id: booking?.faculty_id });
      return false;
    }

    // Build descriptive comments aligned with workflow stage
    let commentsText = "";
    if (status === "Pending") {
      commentsText = "Please review and approve/reject this booking request.";
    } else if (status === "Approved") {
      if (actionBy === "HOD") {
        commentsText = "This booking has been approved by HOD and now requires your approval.";
      } else if (actionBy === "Principal") {
        commentsText = "This booking has been approved by both HOD and Principal. This is the final approval stage.";
      } else if (actionBy === "PRO") {
        commentsText = "Your booking request has been fully approved. This is the final approval stage.";
      }
    } else if (status === "Rejected") {
      const reason = (rejectionReason ?? "").trim();
      const reasonLine = reason ? ` Reason: ${reason}` : "";
      commentsText = `Your booking request has been rejected. Please contact the ${actionBy} for more information or to submit a new request.${reasonLine}`;
    }

    // Derive recipient name for template greeting
    const recipientName = ((): string => {
      if (status === "Pending") return `${booking.department || ""}_HOD`.replace(/^_/,'');
      if (status === "Approved") {
        if (actionBy === "HOD") return "Principal";
        if (actionBy === "Principal") return "PRO";
        if (actionBy === "PRO") return booking.faculty_name || "Faculty";
      }
      if (status === "Rejected") return booking.faculty_name || "Faculty";
      return "";
    })();

    // Format the email subject based on the status
    const emailSubject = status === 'Approved' 
      ? `Booking Approved: ${booking.event_name}` 
      : status === 'Rejected' 
        ? `Booking Rejected: ${booking.event_name}`
        : `New Booking Request: ${booking.event_name}`;

    // Format the email message
    const emailMessage = status === 'Approved'
      ? `Your booking for ${booking.event_name} has been approved by ${actionBy}.`
      : status === 'Rejected'
        ? `Your booking for ${booking.event_name} has been rejected by ${actionBy}.`
        : `A new booking for ${booking.event_name} requires your approval.`;

    // Include HOD information if available
    const hodInfo = booking.hod_name ? `\n\nHOD: ${booking.hod_name}` : '';
    const rejectionInfo = rejectionReason ? `\n\nReason: ${rejectionReason}` : '';

    const emailParams = {
      recipientEmail,
      subject: emailSubject,
      message: `${emailMessage}${hodInfo}${rejectionInfo}`,
      faculty_name: booking.faculty_name,
      faculty_contact: booking.faculty_phone || '',
      department: booking.department,
      hall_name: booking.halls?.name || booking.hall_name || 'Unknown Hall',
      event_name: booking.event_name,
      event_date: booking.event_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      decision: status,
      decision_taken_by: actionBy,
      comments: commentsText || rejectionReason || '',
      attendees: booking.attendees_count || 0,
      extra: {
        // Include all the original template variables as extra data
        to_email: recipientEmail,
        status,
        action_by: actionBy,
        hod_name: booking.hod_name || 'HOD',
        phone: booking.faculty_phone || ''
      }
    };

    await sendTestEmail(emailParams);

    // Create in-app notifications for relevant users
    const notifications = [];
    
    // Always notify the faculty member
    if (booking.faculty_id) {
      notifications.push({
        user_id: booking.faculty_id,
        title: emailSubject,
        message: emailMessage,
        type: status.toLowerCase(),
        read: false,
        data: {
          booking_id: booking.id,
          event_name: booking.event_name,
          status: status,
          action_by: actionBy,
          rejection_reason: rejectionReason
        }
      });
    }

    // If Principal approved, also notify PRO for final approval
    if (status === 'Approved' && actionBy === 'Principal') {
      const { data: proProfile } = await supabase
        .from('profiles')
        .select('id, email, name')
        .eq('role', 'pro')
        .maybeSingle();

      if (proProfile?.id) {
        // Email notification
        const proEmail = proProfile.email;
        const proSubject = 'New Booking Requires PRO Approval';
        const proMessage = `A new booking for ${booking.event_name} requires your final approval.`;
        
        await sendTestEmail({
          recipientEmail: proEmail,
          subject: proSubject,
          message: proMessage,
          recipientName: proProfile.name || 'PRO',
          faculty_name: booking.faculty_name,
          faculty_contact: booking.faculty_phone ?? '',
          department: booking.department,
          hall_name: booking.halls?.name ?? 'Unknown Hall',
          event_name: booking.event_name,
          event_date: booking.event_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          decision: 'Pending',
          decision_taken_by: 'PRO',
          comments: 'This booking requires your final approval.',
          action_url: '/dashboard/pro',
          attendees_count: booking.attendees_count || booking.attendeesCount || booking.attendees || 0,
        });

        // In-app notification
        notifications.push({
          user_id: proProfile.id,
          title: proSubject,
          message: proMessage,
          type: 'pending_approval',
          read: false,
          data: {
            booking_id: booking.id,
            event_name: booking.event_name,
            status: 'pending_pro',
            action_by: 'Principal',
            department: booking.department,
            hall_name: booking.halls?.name || 'Unknown Hall',
            event_date: booking.event_date,
            start_time: booking.start_time,
            end_time: booking.end_time
          }
        });
      }
    }

    // Insert all notifications in a single transaction
    if (notifications.length > 0) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        console.error('Error creating notifications:', notificationError);
      }
    }

    return true;
  } catch (e) {
    console.error("sendBookingNotification error", e);
    return false;
  }
}


