import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// EmailJS configuration
const EMAILJS_SERVICE_ID = Deno.env.get('EMAILJS_SERVICE_ID');
const EMAILJS_TEMPLATE_ID = Deno.env.get('EMAILJS_TEMPLATE_ID');
const EMAILJS_PUBLIC_KEY = Deno.env.get('EMAILJS_PUBLIC_KEY');

interface EmailNotificationRequest {
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
}

const sendEmailJSNotification = async (params: EmailNotificationRequest): Promise<boolean> => {
  try {
    // Validate EmailJS configuration
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
      console.error('EmailJS configuration missing. Please check environment variables.');
      return false;
    }

    const dateTime = `${params.eventDate} from ${params.startTime} to ${params.endTime}`;
    
    // Prepare template parameters for EmailJS
    const templateParams = {
      to_email: params.recipientEmail,
      subject: params.subject,
      hall_name: params.hallName,
      event_name: params.eventName,
      department_name: params.departmentName,
      faculty_name: params.facultyName,
      faculty_phone: params.facultyPhone || 'Not provided',
      hod_name: params.hodName,
      date_time: dateTime,
      event_date: params.eventDate,
      start_time: params.startTime,
      end_time: params.endTime,
      attendees_count: params.attendeesCount || 0,
      decision: params.decision,
      decision_by: params.decisionBy || 'System',
      comments: params.comments || '',
      rejection_reason: params.rejectionReason || '',
      old_hall_name: params.oldHallName || '',
      new_hall_name: params.newHallName || '',
      changer_name: params.changerName || '',
      change_reason: params.changeReason || '',
      app_link: `${supabaseUrl.replace('/rest/v1', '')}/auth`,
      current_year: new Date().getFullYear()
    };

    console.log('Sending EmailJS notification:', {
      to: params.recipientEmail,
      subject: params.subject,
      template: EMAILJS_TEMPLATE_ID
    });

    // Send email using EmailJS API
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: templateParams
      })
    });

    if (!response.ok) {
      throw new Error(`EmailJS API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Email sent successfully via EmailJS:', result);
    return true;

  } catch (error) {
    console.error('Failed to send email notification via EmailJS:', error);
    return false;
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const params: EmailNotificationRequest = await req.json();

    console.log(`Sending email notification to ${params.recipientEmail} for ${params.notificationType}`);

    // Create email log entry
    const { data: emailLog, error: logError } = await supabase
      .from('email_logs')
      .insert({
        recipient_email: params.recipientEmail,
        subject: params.subject,
        body: `EmailJS notification: ${params.subject}`,
        booking_id: params.bookingId,
        notification_type: params.notificationType,
        status: 'pending'
      })
      .select()
      .single();

    if (logError) {
      console.error('Error creating email log:', logError);
      return new Response(JSON.stringify({ error: 'Failed to create email log' }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Send email using EmailJS
    try {
      const success = await sendEmailJSNotification(params);

      if (success) {
        // Update email log as successful
        await supabase
          .from('email_logs')
          .update({ status: 'success' })
          .eq('id', emailLog.id);

        return new Response(JSON.stringify({ 
          success: true, 
          logId: emailLog.id 
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      } else {
        throw new Error('EmailJS notification failed');
      }

    } catch (emailError: any) {
      console.error("Error sending email via EmailJS:", emailError);

      // Update email log as failed
      await supabase
        .from('email_logs')
        .update({ 
          status: 'failure',
          error_message: emailError.message 
        })
        .eq('id', emailLog.id);

      // Don't fail the request if email fails - just log it
      return new Response(JSON.stringify({ 
        success: false, 
        error: emailError.message,
        logId: emailLog.id 
      }), {
        status: 200, // Return 200 so booking process continues
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

  } catch (error: any) {
    console.error("Error in send-emailjs-notification function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
