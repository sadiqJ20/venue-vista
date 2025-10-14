import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  sendNewBookingNotification,
  sendHODApprovalNotification,
  sendPrincipalApprovalNotification,
  sendFinalApprovalNotification,
  sendRejectionNotification,
  sendHallChangeNotification
} from '@/lib/emailNotifications';

export const useEmailNotifications = () => {
  const [loading, setLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  /**
   * Send email notification via Supabase Edge Function
   */
  const sendEmailViaEdgeFunction = async (params: {
    recipientEmail: string;
    subject: string;
    hallName: string;
    eventName: string;
    departmentName: string;
    facultyName: string;
    facultyPhone?: string;
    hodName: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    attendeesCount?: number;
    decision: 'Approved' | 'Rejected' | 'Pending' | 'Changed';
    decisionBy?: string;
    comments?: string;
    rejectionReason?: string;
    oldHallName?: string;
    newHallName?: string;
    changerName?: string;
    changeReason?: string;
    notificationType: string;
    bookingId?: string;
  }): Promise<boolean> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('send-emailjs-notification', {
        body: params
      });

      if (error) {
        console.error('Error sending email via edge function:', error);
        return false;
      }

      console.log('Email sent via edge function:', data);
      return data?.success || false;
    } catch (error) {
      console.error('Failed to send email via edge function:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Send new booking notification to HOD
   */
  const notifyHODNewBooking = async (bookingData: {
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
    try {
      setLoading(true);
      
      // Try frontend EmailJS first
      const frontendSuccess = await sendNewBookingNotification(bookingData);
      
      if (frontendSuccess) {
        setEmailStatus({
          success: true,
          message: "Email notification sent to HOD successfully"
        });
        return true;
      }

      // Fallback to edge function
      const edgeSuccess = await sendEmailViaEdgeFunction({
        recipientEmail: bookingData.hodEmail,
        subject: `New Hall Booking Request - ${bookingData.hallName}`,
        hallName: bookingData.hallName,
        eventName: bookingData.eventName,
        departmentName: bookingData.departmentName,
        facultyName: bookingData.facultyName,
        facultyPhone: bookingData.facultyPhone,
        hodName: bookingData.hodName,
        eventDate: bookingData.eventDate,
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        attendeesCount: bookingData.attendeesCount,
        decision: 'Pending',
        decisionBy: 'HOD',
        comments: 'Please review and approve/reject this booking request.',
        notificationType: 'new_booking_request'
      });
      
      if (edgeSuccess) {
        setEmailStatus({
          success: true,
          message: "Email notification sent to HOD via fallback method"
        });
      } else {
        setEmailStatus({
          success: false,
          message: "Failed to send email notification to HOD"
        });
      }
      
      return edgeSuccess;
    } catch (error) {
      console.error('Failed to notify HOD of new booking:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Send approval notification to Principal
   */
  const notifyPrincipalApproval = async (approvalData: {
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
    try {
      setLoading(true);
      
      const frontendSuccess = await sendHODApprovalNotification(approvalData);
      
      if (frontendSuccess) {
        return true;
      }

      return await sendEmailViaEdgeFunction({
        recipientEmail: approvalData.principalEmail,
        subject: `Hall Booking Approval Required - ${approvalData.hallName}`,
        hallName: approvalData.hallName,
        eventName: approvalData.eventName,
        departmentName: approvalData.departmentName,
        facultyName: approvalData.facultyName,
        facultyPhone: approvalData.facultyPhone,
        hodName: approvalData.hodName,
        eventDate: approvalData.eventDate,
        startTime: approvalData.startTime,
        endTime: approvalData.endTime,
        attendeesCount: approvalData.attendeesCount,
        decision: 'Pending',
        decisionBy: 'Principal',
        comments: 'This booking has been approved by HOD and now requires your approval.',
        notificationType: 'approval_required'
      });
    } catch (error) {
      console.error('Failed to notify Principal of approval:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Send approval notification to PRO
   */
  const notifyPROApproval = async (approvalData: {
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
    try {
      setLoading(true);
      
      const frontendSuccess = await sendPrincipalApprovalNotification(approvalData);
      
      if (frontendSuccess) {
        return true;
      }

      return await sendEmailViaEdgeFunction({
        recipientEmail: approvalData.proEmail,
        subject: `Final Hall Booking Approval Required - ${approvalData.hallName}`,
        hallName: approvalData.hallName,
        eventName: approvalData.eventName,
        departmentName: approvalData.departmentName,
        facultyName: approvalData.facultyName,
        facultyPhone: approvalData.facultyPhone,
        hodName: approvalData.hodName,
        eventDate: approvalData.eventDate,
        startTime: approvalData.startTime,
        endTime: approvalData.endTime,
        attendeesCount: approvalData.attendeesCount,
        decision: 'Pending',
        decisionBy: 'PRO',
        comments: 'This booking has been approved by both HOD and Principal. This is the final approval stage.',
        notificationType: 'approval_required'
      });
    } catch (error) {
      console.error('Failed to notify PRO of approval:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Send final approval confirmation to faculty
   */
  const notifyFacultyFinalApproval = async (approvalData: {
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
    try {
      setLoading(true);
      
      const frontendSuccess = await sendFinalApprovalNotification(approvalData);
      
      if (frontendSuccess) {
        return true;
      }

      return await sendEmailViaEdgeFunction({
        recipientEmail: approvalData.facultyEmail,
        subject: `Your Hall is Booked Successfully! - ${approvalData.hallName}`,
        hallName: approvalData.hallName,
        eventName: approvalData.eventName,
        departmentName: approvalData.departmentName,
        facultyName: approvalData.facultyName,
        facultyPhone: approvalData.facultyPhone,
        hodName: approvalData.hodName,
        eventDate: approvalData.eventDate,
        startTime: approvalData.startTime,
        endTime: approvalData.endTime,
        attendeesCount: approvalData.attendeesCount,
        decision: 'Approved',
        decisionBy: approvalData.approverRole,
        comments: 'Your hall booking is now confirmed! Please ensure you arrive on time and follow all hall usage guidelines.',
        notificationType: 'booking_approved'
      });
    } catch (error) {
      console.error('Failed to notify faculty of final approval:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Send rejection notification to faculty
   */
  const notifyFacultyRejection = async (rejectionData: {
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
    try {
      setLoading(true);
      
      const frontendSuccess = await sendRejectionNotification(rejectionData);
      
      if (frontendSuccess) {
        return true;
      }

      return await sendEmailViaEdgeFunction({
        recipientEmail: rejectionData.facultyEmail,
        subject: `Hall Booking Request Rejected - ${rejectionData.hallName}`,
        hallName: rejectionData.hallName,
        eventName: rejectionData.eventName,
        departmentName: rejectionData.departmentName,
        facultyName: rejectionData.facultyName,
        facultyPhone: rejectionData.facultyPhone,
        hodName: rejectionData.hodName,
        eventDate: rejectionData.eventDate,
        startTime: rejectionData.startTime,
        endTime: rejectionData.endTime,
        attendeesCount: rejectionData.attendeesCount,
        decision: 'Rejected',
        decisionBy: rejectionData.rejectorRole,
        rejectionReason: rejectionData.rejectionReason,
        comments: `Please contact the ${rejectionData.rejectorRole} for more information or to submit a new request.`,
        notificationType: 'booking_rejected'
      });
    } catch (error) {
      console.error('Failed to notify faculty of rejection:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Send hall change notification to faculty
   */
  const notifyFacultyHallChange = async (changeData: {
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
    try {
      setLoading(true);
      
      const frontendSuccess = await sendHallChangeNotification(changeData);
      
      if (frontendSuccess) {
        return true;
      }

      return await sendEmailViaEdgeFunction({
        recipientEmail: changeData.facultyEmail,
        subject: `Hall Assignment Changed - ${changeData.oldHallName} to ${changeData.newHallName}`,
        hallName: changeData.newHallName,
        eventName: changeData.eventName,
        departmentName: changeData.departmentName,
        facultyName: changeData.facultyName,
        facultyPhone: changeData.facultyPhone,
        hodName: changeData.hodName,
        eventDate: changeData.eventDate,
        startTime: changeData.startTime,
        endTime: changeData.endTime,
        decision: 'Changed',
        decisionBy: changeData.changerName,
        oldHallName: changeData.oldHallName,
        newHallName: changeData.newHallName,
        changerName: changeData.changerName,
        changeReason: changeData.changeReason,
        comments: `Hall changed from ${changeData.oldHallName} to ${changeData.newHallName}. Reason: ${changeData.changeReason}`,
        notificationType: 'hall_changed'
      });
    } catch (error) {
      console.error('Failed to notify faculty of hall change:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    emailStatus,
    setEmailStatus,
    notifyHODNewBooking,
    notifyPrincipalApproval,
    notifyPROApproval,
    notifyFacultyFinalApproval,
    notifyFacultyRejection,
    notifyFacultyHallChange,
    sendEmailViaEdgeFunction
  };
};
