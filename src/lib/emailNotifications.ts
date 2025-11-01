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
        const { data } = await supabase.from("profiles").select("email").eq("role", "principal").maybeSingle();
        recipientEmail = data?.email || "";
      } else if (actionBy === "Principal" || actionBy === "PRO") {
        // Get faculty email from profiles table using faculty_id
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

    // If Principal approved, also notify PRO per updated workflow
    if (status === "Approved" && actionBy === "Principal") {
      const { data: proProfile } = await supabase
        .from("profiles")
        .select("email, name")
        .eq("role", "pro")
        .maybeSingle();

      const proEmail = proProfile?.email || "";
      if (proEmail) {
        const proSubject = "Booking Request Update";
        const proMessage = `Booking update for ${booking.event_name} (${booking.event_date} ${booking.start_time}-${booking.end_time})`;
        await sendTestEmail({
          recipientEmail: proEmail,
          subject: proSubject,
          message: proMessage,
          recipientName: "PRO",
          faculty_name: booking.faculty_name,
          faculty_contact: booking.faculty_phone ?? "",
          department: booking.department,
          hall_name: booking.halls?.name ?? "",
          event_name: booking.event_name,
          event_date: booking.event_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          decision: "Approved",
          decision_taken_by: "Principal",
          comments: "This booking has been approved by both HOD and Principal.",
          action_url: "/dashboard",
          attendees_count: booking.attendees_count || booking.attendeesCount || booking.attendees || null,
        });
      }
    }

    return true;
  } catch (e) {
    console.error("sendBookingNotification error", e);
    return false;
  }
}


