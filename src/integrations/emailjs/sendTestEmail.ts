import emailjs from "@emailjs/browser";

export interface SendTestEmailParams {
  recipientEmail: string;
  subject: string;
  message: string;
  // Optional fields to be compatible with previously used templates
  recipientName?: string;
  fromName?: string;
  replyTo?: string;
  extra?: Record<string, string>;
  // Booking-style variables for previewing workflow emails
  faculty_name?: string;
  faculty_contact?: string;
  department?: string;
  hall_name?: string;
  event_name?: string;
  event_date?: string; // e.g., 2025-10-14
  start_time?: string; // e.g., 11:55
  end_time?: string;   // e.g., 12:00
  decision?: string;   // e.g., Approved / Rejected / Pending
  decision_taken_by?: string; // e.g., HOD/Principal/PRO
  comments?: string;
  action_url?: string;
}

export async function sendTestEmail(params: SendTestEmailParams): Promise<void> {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined;

  if (!serviceId || !templateId || !publicKey) {
    throw new Error("EmailJS not configured. Set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY.");
  }

  const templateParams: Record<string, string> = {
    // Common aliases used across EmailJS templates to improve compatibility
    to_email: params.recipientEmail,
    to: params.recipientEmail,
    recipient_email: params.recipientEmail,
    subject: params.subject,
    message: params.message,
    to_name: params.recipientName ?? "",
    from_name: params.fromName ?? "Venue Vista",
    reply_to: params.replyTo ?? params.recipientEmail,
    // Booking-style aliases
    faculty_name: params.faculty_name ?? "",
    faculty_contact: params.faculty_contact ?? "",
    department: params.department ?? "",
    hall_name: params.hall_name ?? "",
    event_name: params.event_name ?? "",
    event_date: params.event_date ?? "",
    start_time: params.start_time ?? "",
    end_time: params.end_time ?? "",
    decision: params.decision ?? "",
    decision_taken_by: params.decision_taken_by ?? "",
    comments: params.comments ?? "",
    action_url: params.action_url ?? "",
    ...(params.extra ?? {}),
  };

  await emailjs.send(serviceId, templateId, templateParams, { publicKey });
}


