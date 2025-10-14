import emailjs from '@emailjs/browser';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// EmailJS configuration
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// Initialize EmailJS
if (EMAILJS_PUBLIC_KEY) {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}

/**
 * Get HOD information for a given department
 */
export const getHODInfo = async (department: Database["public"]["Enums"]["department_name"]) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('role', 'hod')
      .eq('department', department)
      .single();

    if (error) {
      console.error('Error fetching HOD info:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching HOD info:', error);
    return null;
  }
};

/**
 * Get user information by role (for Principal and PRO)
 */
export const getUserByRole = async (role: 'principal' | 'pro') => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('role', role)
      .single();

    if (error) {
      console.error(`Error fetching ${role} info:`, error);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Error fetching ${role} info:`, error);
    return null;
  }
};

/**
 * Main function to send booking emails as requested in requirements
 * This function uses the existing EmailJS template with the specified variables
 */
export const sendBookingEmail = (data: {
  to_email: string;
  recipient_name: string;
  faculty_name: string;
  faculty_contact: string;
  department_name: string;
  hall_name: string;
  event_name: string;
  booking_date_time: string;
  approved_by: string;
  comments: string;
  link: string;
}) => {
  const templateParams = {
    to_email: data.to_email,
    recipient_name: data.recipient_name,
    faculty_name: data.faculty_name,
    faculty_contact: data.faculty_contact,
    department_name: data.department_name,
    hall_name: data.hall_name,
    event_name: data.event_name,
    booking_date_time: data.booking_date_time,
    approved_by: data.approved_by,
    comments: data.comments,
    link: data.link
  };

  return emailjs.send(
    import.meta.env.VITE_EMAILJS_SERVICE_ID,
    import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
    templateParams,
    import.meta.env.VITE_EMAILJS_PUBLIC_KEY
  );
};

/**
 * Centralized function to determine email recipient based on approval stage
 * This implements the correct email flow logic
 */
export const getEmailRecipient = async (booking: any, actionBy: string, status: string) => {
  try {
    // Get all required email addresses
    const [hodInfo, principalInfo, proInfo, facultyInfo] = await Promise.all([
      getHODInfo(booking.department),
      getUserByRole('principal'),
      getUserByRole('pro'),
      supabase.from('profiles').select('email').eq('id', booking.faculty_id || '').single()
    ]);

    const recipientEmail = {
      faculty: facultyInfo.data?.email,
      hod: hodInfo?.email,
      principal: principalInfo?.email,
      pro: proInfo?.email
    };

    // Determine recipient based on action and status
    let sendTo = '';
    let recipientName = '';
    let decisionBy = '';
    let comments = '';

    if (actionBy === "Faculty") {
      // Faculty submits booking → send to HOD
      sendTo = recipientEmail.hod;
      recipientName = hodInfo?.name || 'HOD';
      decisionBy = 'HOD';
      comments = 'Please review and approve/reject this booking request.';
    } else if (actionBy === "HOD" && status === "Approved") {
      // HOD approves → send to Principal
      sendTo = recipientEmail.principal;
      recipientName = principalInfo?.name || 'Principal';
      decisionBy = 'Principal';
      comments = 'This booking has been approved by HOD and now requires your approval.';
    } else if (actionBy === "Principal" && status === "Approved") {
      // Principal approves → send to PRO
      sendTo = recipientEmail.pro;
      recipientName = proInfo?.name || 'PRO';
      decisionBy = 'PRO';
      comments = 'This booking has been approved by both HOD and Principal. This is the final approval stage.';
    } else if (actionBy === "PRO" && status === "Approved") {
      // PRO approves → send confirmation to Faculty
      sendTo = recipientEmail.faculty;
      recipientName = booking.faculty_name;
      decisionBy = 'PRO';
      comments = 'Your hall booking is now confirmed! Please ensure you arrive on time and follow all hall usage guidelines.';
    } else if (status === "Rejected") {
      // Any rejection → send to Faculty
      sendTo = recipientEmail.faculty;
      recipientName = booking.faculty_name;
      decisionBy = actionBy === 'HOD' ? 'HOD' : actionBy === 'Principal' ? 'Principal' : 'PRO';
      comments = `Your booking request has been rejected. Please contact the ${decisionBy} for more information or to submit a new request.`;
    }

    return {
      sendTo,
      recipientName,
      decisionBy,
      comments,
      recipientEmail
    };
  } catch (error) {
    console.error('Error determining email recipient:', error);
    return null;
  }
};

/**
 * Unified function to send booking emails with correct recipient logic
 * This replaces the individual notification functions with proper flow
 */
export const sendBookingNotification = async (booking: any, actionBy: string, status: string, rejectionReason?: string) => {
  try {
    // Get recipient information
    const recipientInfo = await getEmailRecipient(booking, actionBy, status);
    
    if (!recipientInfo || !recipientInfo.sendTo) {
      console.error('No recipient found for email notification');
      return false;
    }

    // Prepare email data
    const bookingDateTime = `${booking.event_date} from ${booking.start_time} to ${booking.end_time}`;
    const hallName = booking.halls?.name || 'Unknown Hall';
    
    // Add rejection reason to comments if applicable
    let comments = recipientInfo.comments;
    if (status === "Rejected" && rejectionReason) {
      comments += ` Reason: ${rejectionReason}`;
    }

    // Prepare email data for sendBookingEmail function
    const emailData = {
      to_email: recipientInfo.sendTo,
      recipient_name: recipientInfo.recipientName,
      faculty_name: booking.faculty_name,
      faculty_contact: booking.faculty_phone || 'Not provided',
      department_name: booking.department,
      hall_name: hallName,
      event_name: booking.event_name,
      booking_date_time: bookingDateTime,
      approved_by: recipientInfo.decisionBy,
      comments: comments,
      link: window.location.origin + '/auth'
    };

    console.log('Sending booking notification:', {
      nextRecipientEmail: recipientInfo.sendTo,
      actionBy,
      status,
      recipientName: recipientInfo.recipientName
    });

    // Send email using the main sendBookingEmail function
    const result = await sendBookingEmail(emailData);
    
    if (result.status === 200) {
      console.log('Email sent successfully to:', recipientInfo.sendTo);
      return true;
    } else {
      console.error('Email sending failed:', result);
      return false;
    }
  } catch (error) {
    console.error('Error sending booking notification:', error);
    return false;
  }
};

export interface EmailNotificationParams {
  toEmail: string;
  subject: string;
  hallName: string;
  eventName: string;
  departmentName: string;
  facultyName: string;
  facultyPhone?: string;
  hodName: string;
  dateTime: string;
  decision: 'Approved' | 'Rejected' | 'Pending';
  decisionBy?: string;
  comments?: string;
  link?: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  attendeesCount?: number;
  rejectionReason?: string;
}

/**
 * Sends email notification using EmailJS
 * @param params - Email notification parameters
 * @returns Promise<boolean> - Success status
 */
export const sendEmailNotification = async (params: EmailNotificationParams): Promise<boolean> => {
  try {
    // Validate EmailJS configuration
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
      console.error('EmailJS configuration missing. Please check environment variables.');
      return false;
    }

    // Prepare template parameters for EmailJS
    const templateParams = {
      to_email: params.toEmail,
      recipient_name: params.toEmail.split('@')[0], // Extract name from email
      faculty_name: params.facultyName,
      faculty_contact: params.facultyPhone || 'Not provided',
      department_name: params.departmentName,
      hall_name: params.hallName,
      event_name: params.eventName,
      booking_date_time: params.dateTime,
      approved_by: params.decisionBy || 'System',
      comments: params.comments || '',
      link: params.link || window.location.origin + '/auth'
    };

    console.log('Sending email notification:', {
      to: params.toEmail,
      subject: params.subject,
      template: EMAILJS_TEMPLATE_ID
    });

    // Send email using EmailJS
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    console.log('Email sent successfully:', response);
    return true;

  } catch (error) {
    console.error('Failed to send email notification:', error);
    return false;
  }
};

/**
 * Sends notification when faculty books a hall (to HOD)
 */
export const sendNewBookingNotification = async (params: {
  hodEmail: string;
  hodName: string;
  facultyName: string;
  facultyPhone?: string;
  hallName: string;
  eventName: string;
  departmentName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  attendeesCount: number;
}): Promise<boolean> => {
  const dateTime = `${params.eventDate} from ${params.startTime} to ${params.endTime}`;
  
  return sendEmailNotification({
    toEmail: params.hodEmail,
    subject: `New Hall Booking Request - ${params.hallName}`,
    hallName: params.hallName,
    eventName: params.eventName,
    departmentName: params.departmentName,
    facultyName: params.facultyName,
    facultyPhone: params.facultyPhone,
    hodName: params.hodName,
    dateTime,
    eventDate: params.eventDate,
    startTime: params.startTime,
    endTime: params.endTime,
    attendeesCount: params.attendeesCount,
    decision: 'Pending',
    decisionBy: 'HOD',
    comments: 'Please review and approve/reject this booking request.'
  });
};

/**
 * Sends notification when HOD approves (to Principal)
 */
export const sendHODApprovalNotification = async (params: {
  principalEmail: string;
  principalName: string;
  facultyName: string;
  facultyPhone?: string;
  hallName: string;
  eventName: string;
  departmentName: string;
  hodName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  attendeesCount: number;
}): Promise<boolean> => {
  const dateTime = `${params.eventDate} from ${params.startTime} to ${params.endTime}`;
  
  return sendEmailNotification({
    toEmail: params.principalEmail,
    subject: `Hall Booking Approval Required - ${params.hallName}`,
    hallName: params.hallName,
    eventName: params.eventName,
    departmentName: params.departmentName,
    facultyName: params.facultyName,
    facultyPhone: params.facultyPhone,
    hodName: params.hodName,
    dateTime,
    eventDate: params.eventDate,
    startTime: params.startTime,
    endTime: params.endTime,
    attendeesCount: params.attendeesCount,
    decision: 'Pending',
    decisionBy: 'Principal',
    comments: 'This booking has been approved by HOD and now requires your approval.'
  });
};

/**
 * Sends notification when Principal approves (to PRO)
 */
export const sendPrincipalApprovalNotification = async (params: {
  proEmail: string;
  proName: string;
  facultyName: string;
  facultyPhone?: string;
  hallName: string;
  eventName: string;
  departmentName: string;
  hodName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  attendeesCount: number;
}): Promise<boolean> => {
  const dateTime = `${params.eventDate} from ${params.startTime} to ${params.endTime}`;
  
  return sendEmailNotification({
    toEmail: params.proEmail,
    subject: `Final Hall Booking Approval Required - ${params.hallName}`,
    hallName: params.hallName,
    eventName: params.eventName,
    departmentName: params.departmentName,
    facultyName: params.facultyName,
    facultyPhone: params.facultyPhone,
    hodName: params.hodName,
    dateTime,
    eventDate: params.eventDate,
    startTime: params.startTime,
    endTime: params.endTime,
    attendeesCount: params.attendeesCount,
    decision: 'Pending',
    decisionBy: 'PRO',
    comments: 'This booking has been approved by both HOD and Principal. This is the final approval stage.'
  });
};

/**
 * Sends final approval confirmation to faculty
 */
export const sendFinalApprovalNotification = async (params: {
  facultyEmail: string;
  facultyName: string;
  facultyPhone?: string;
  hallName: string;
  eventName: string;
  departmentName: string;
  hodName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  attendeesCount: number;
  approverName: string;
  approverRole: string;
}): Promise<boolean> => {
  const dateTime = `${params.eventDate} from ${params.startTime} to ${params.endTime}`;
  
  return sendEmailNotification({
    toEmail: params.facultyEmail,
    subject: `Your Hall is Booked Successfully! - ${params.hallName}`,
    hallName: params.hallName,
    eventName: params.eventName,
    departmentName: params.departmentName,
    facultyName: params.facultyName,
    facultyPhone: params.facultyPhone,
    hodName: params.hodName,
    dateTime,
    eventDate: params.eventDate,
    startTime: params.startTime,
    endTime: params.endTime,
    attendeesCount: params.attendeesCount,
    decision: 'Approved',
    decisionBy: params.approverRole,
    comments: 'Your hall booking is now confirmed! Please ensure you arrive on time and follow all hall usage guidelines.'
  });
};

/**
 * Sends rejection notification to faculty
 */
export const sendRejectionNotification = async (params: {
  facultyEmail: string;
  facultyName: string;
  facultyPhone?: string;
  hallName: string;
  eventName: string;
  departmentName: string;
  hodName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  attendeesCount: number;
  rejectorName: string;
  rejectorRole: string;
  rejectionReason: string;
}): Promise<boolean> => {
  const dateTime = `${params.eventDate} from ${params.startTime} to ${params.endTime}`;
  
  return sendEmailNotification({
    toEmail: params.facultyEmail,
    subject: `Hall Booking Request Rejected - ${params.hallName}`,
    hallName: params.hallName,
    eventName: params.eventName,
    departmentName: params.departmentName,
    facultyName: params.facultyName,
    facultyPhone: params.facultyPhone,
    hodName: params.hodName,
    dateTime,
    eventDate: params.eventDate,
    startTime: params.startTime,
    endTime: params.endTime,
    attendeesCount: params.attendeesCount,
    decision: 'Rejected',
    decisionBy: params.rejectorRole,
    rejectionReason: params.rejectionReason,
    comments: `Please contact the ${params.rejectorRole} for more information or to submit a new request.`
  });
};

/**
 * Sends hall change notification to faculty
 */
export const sendHallChangeNotification = async (params: {
  facultyEmail: string;
  facultyName: string;
  facultyPhone?: string;
  oldHallName: string;
  newHallName: string;
  eventName: string;
  departmentName: string;
  hodName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  changerName: string;
  changeReason: string;
}): Promise<boolean> => {
  const dateTime = `${params.eventDate} from ${params.startTime} to ${params.endTime}`;
  
  return sendEmailNotification({
    toEmail: params.facultyEmail,
    subject: `Hall Assignment Changed - ${params.oldHallName} to ${params.newHallName}`,
    hallName: params.newHallName,
    eventName: params.eventName,
    departmentName: params.departmentName,
    facultyName: params.facultyName,
    facultyPhone: params.facultyPhone,
    hodName: params.hodName,
    dateTime,
    eventDate: params.eventDate,
    startTime: params.startTime,
    endTime: params.endTime,
    decision: 'Pending',
    decisionBy: params.changerName,
    comments: `Hall changed from ${params.oldHallName} to ${params.newHallName}. Reason: ${params.changeReason}`
  });
};
