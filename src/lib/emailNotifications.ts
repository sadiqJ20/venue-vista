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
      } else if (actionBy === "Principal") {
        // Principal is now final approver → notify faculty
        recipientEmail = booking.faculty_email || "";
        if (!recipientEmail && booking.faculty_id) {
          const { data } = await supabase.from("profiles").select("email").eq("id", booking.faculty_id).maybeSingle();
          recipientEmail = data?.email || "";
        }
      } else if (actionBy === "PRO") {
        // Keep for backward compatibility
        recipientEmail = booking.faculty_email || "";
        if (!recipientEmail && booking.faculty_id) {
          const { data } = await supabase.from("profiles").select("email").eq("id", booking.faculty_id).maybeSingle();
          recipientEmail = data?.email || "";
        }
      }
    } else if (status === "Rejected") {
      // Notify faculty on rejection
      recipientEmail = booking.faculty_email || "";
      if (!recipientEmail && booking.faculty_id) {
        const { data } = await supabase.from("profiles").select("email").eq("id", booking.faculty_id).maybeSingle();
        recipientEmail = data?.email || "";
      }
    }

    if (!recipientEmail) {
      console.warn("sendBookingNotification: No recipient email resolved", { status, actionBy, bookingId: booking?.id, faculty_id: booking?.faculty_id });
      return false;
    }

    const subject = status === "Pending"
      ? `New Hall Booking Request - ${booking.halls?.name || "Hall"}`
      : status === "Approved"
      ? `Booking Request Update`
      : `Hall Booking Request Rejected - ${booking.halls?.name || "Hall"}`;

    const message = `Booking update for ${booking.event_name} (${booking.event_date} ${booking.start_time}-${booking.end_time})`;

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

    await sendTestEmail({
      recipientEmail,
      subject,
      message,
      recipientName,
      faculty_name: booking.faculty_name,
      faculty_contact: booking.faculty_phone ?? "",
      department: booking.department,
      hall_name: booking.halls?.name ?? "",
      event_name: booking.event_name,
      event_date: booking.event_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      decision: status,
      decision_taken_by: actionBy,
      comments: commentsText,
      action_url: "/dashboard",
      attendees: booking.attendees_count || booking.attendeesCount || booking.attendees || null,
      // Add direct mapping for the email template
      attendees_count: booking.attendees_count || booking.attendeesCount || booking.attendees || null,
    });

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


