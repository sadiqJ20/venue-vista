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

  // Ensure key fields render even if not provided
  const commentsValue = (params.comments ?? "").trim() || "N/A";
  const departmentValue = (params.department ?? "").trim() || "N/A";
  const decisionByValue = (params.decision_taken_by ?? "").trim() || "N/A";

  const templateParams: Record<string, string> = {
    // Common aliases used across EmailJS templates to improve compatibility
    to_email: params.recipientEmail,
    to: params.recipientEmail,
    recipient_email: params.recipientEmail,
    subject: params.subject,
    message: params.message,
    to_name: params.recipientName ?? "",
    recipient_name: params.recipientName ?? "",
    from_name: params.fromName ?? "Venue Vista",
    reply_to: params.replyTo ?? params.recipientEmail,
    // Booking-style aliases
    faculty_name: params.faculty_name ?? "",
    faculty_contact: params.faculty_contact ?? "",
    department: departmentValue,
    hall_name: params.hall_name ?? "",
    event_name: params.event_name ?? "",
    event_date: params.event_date ?? "",
    start_time: params.start_time ?? "",
    end_time: params.end_time ?? "",
    decision: params.decision ?? "",
    decision_taken_by: decisionByValue,
    comments: commentsValue,
    action_url: params.action_url ?? "",
    // Aliases to match common EmailJS template fields used in the UI/email preview
    // Booking Date & Time combined variations
    booking_date_time: params.event_date && params.start_time && params.end_time
      ? `${params.event_date} from ${params.start_time} to ${params.end_time}`
      : "",
    Booking_Date_Time: params.event_date && params.start_time && params.end_time
      ? `${params.event_date} from ${params.start_time} to ${params.end_time}`
      : "",
    bookingDateTime: params.event_date && params.start_time && params.end_time
      ? `${params.event_date} from ${params.start_time} to ${params.end_time}`
      : "",
    // Title-cased/camel/snake duplicates for broader template compatibility
    Faculty_Name: params.faculty_name ?? "",
    FacultyName: params.faculty_name ?? "",
    Faculty_Contact: params.faculty_contact ?? "",
    FacultyContact: params.faculty_contact ?? "",
    Department: departmentValue,
    Hall_Name: params.hall_name ?? "",
    HallName: params.hall_name ?? "",
    Event_Name: params.event_name ?? "",
    EventName: params.event_name ?? "",
    // Recipient name aliases
    Recipient_Name: params.recipientName ?? "",
    recipientName: params.recipientName ?? "",
    RecipientName: params.recipientName ?? "",
    Decision: params.decision ?? "",
    Decision_Taken_By: decisionByValue,
    DecisionTakenBy: decisionByValue,
    Comments: commentsValue,
    Action_URL: params.action_url ?? "",
    ActionURL: params.action_url ?? "",
    // Additional common aliases
    // Department
    dept: departmentValue,
    department_name: departmentValue,
    dept_name: departmentValue,
    // Decision taken by
    decision_by: decisionByValue,
    decisionBy: decisionByValue,
    approved_by: decisionByValue,
    rejected_by: decisionByValue,
    taken_by: decisionByValue,
    // Space-named aliases to match templates using variables with spaces
    "Decision Taken By": decisionByValue,
    "Booking Date & Time": (params.event_date && params.start_time && params.end_time)
      ? `${params.event_date} from ${params.start_time} to ${params.end_time}`
      : "",
    // Comments/remarks
    comment: commentsValue,
    remark: commentsValue,
    remarks: commentsValue,
    rejection_reason: commentsValue,
    reason: commentsValue,
    ...(params.extra ?? {}),
  };

  await emailjs.send(serviceId, templateId, templateParams, { publicKey });
}


