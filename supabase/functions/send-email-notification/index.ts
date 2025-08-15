import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface EmailNotificationRequest {
  recipientEmail: string;
  subject: string;
  body: string;
  bookingId?: string;
  notificationType: string;
  notificationData?: any;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipientEmail, subject, body, bookingId, notificationType, notificationData }: EmailNotificationRequest = await req.json();

    console.log(`Sending email notification to ${recipientEmail} for ${notificationType}`);

    // Create email log entry
    const { data: emailLog, error: logError } = await supabase
      .from('email_logs')
      .insert({
        recipient_email: recipientEmail,
        subject,
        body,
        booking_id: bookingId,
        notification_type: notificationType,
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

    // Send email
    try {
      const emailResponse = await resend.emails.send({
        from: "Hall Booking System <onboarding@resend.dev>",
        to: [recipientEmail],
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
              Hall Booking System Notification
            </h2>
            <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
              ${body.split('\n').map(line => `<p style="margin: 10px 0;">${line}</p>`).join('')}
            </div>
            ${notificationData ? `
              <div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                <h3 style="color: #555; margin-top: 0;">Booking Details:</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  ${notificationData.hall_name ? `<li><strong>Hall:</strong> ${notificationData.hall_name}</li>` : ''}
                  ${notificationData.event_date ? `<li><strong>Date:</strong> ${notificationData.event_date}</li>` : ''}
                  ${notificationData.start_time ? `<li><strong>Start Time:</strong> ${notificationData.start_time}</li>` : ''}
                  ${notificationData.end_time ? `<li><strong>End Time:</strong> ${notificationData.end_time}</li>` : ''}
                  ${notificationData.event_name ? `<li><strong>Event:</strong> ${notificationData.event_name}</li>` : ''}
                  ${notificationData.faculty_name ? `<li><strong>Requested by:</strong> ${notificationData.faculty_name}</li>` : ''}
                  ${notificationData.decision_by ? `<li><strong>Decision by:</strong> ${notificationData.decision_by}</li>` : ''}
                  ${notificationData.rejection_reason ? `<li><strong>Reason:</strong> ${notificationData.rejection_reason}</li>` : ''}
                  ${notificationData.reason ? `<li><strong>Hall Change Reason:</strong> ${notificationData.reason}</li>` : ''}
                </ul>
              </div>
            ` : ''}
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
              <p>This is an automated notification from the Hall Booking System.</p>
            </div>
          </div>
        `,
      });

      console.log("Email sent successfully:", emailResponse);

      // Update email log as successful
      await supabase
        .from('email_logs')
        .update({ status: 'success' })
        .eq('id', emailLog.id);

      return new Response(JSON.stringify({ 
        success: true, 
        emailId: emailResponse.data?.id,
        logId: emailLog.id 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } catch (emailError: any) {
      console.error("Error sending email:", emailError);

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
    console.error("Error in send-email-notification function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);