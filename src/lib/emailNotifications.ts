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
        const { data } = await supabase.from("profiles").select("email").eq("role", "pro").maybeSingle();
        recipientEmail = data?.email || "";
      } else if (actionBy === "PRO") {
        // Final approval → notify faculty
        const { data } = await supabase.from("profiles").select("email").eq("id", booking.faculty_id).maybeSingle();
        recipientEmail = data?.email || "";
      }
    } else if (status === "Rejected") {
      // Notify faculty on rejection
      const { data } = await supabase.from("profiles").select("email").eq("id", booking.faculty_id).maybeSingle();
      recipientEmail = data?.email || "";
    }

    if (!recipientEmail) return false;

    const subject = status === "Pending"
      ? `New Hall Booking Request - ${booking.halls?.name || "Hall"}`
      : status === "Approved"
      ? `Booking Request Update`
      : `Hall Booking Request Rejected - ${booking.halls?.name || "Hall"}`;

    const message = `Booking update for ${booking.event_name} (${booking.event_date} ${booking.start_time}-${booking.end_time})`;

    await sendTestEmail({
      recipientEmail,
      subject,
      message,
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
      comments: rejectionReason ?? "",
      action_url: "/dashboard",
    });

    return true;
  } catch (e) {
    console.error("sendBookingNotification error", e);
    return false;
  }
}


