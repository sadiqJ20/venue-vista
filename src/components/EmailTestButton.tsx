import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Mail } from "lucide-react";

export const EmailTestButton = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [sending, setSending] = useState(false);

  const sendTestEmail = async () => {
    if (!profile?.email) {
      toast({
        title: "Error",
        description: "No email address found in profile",
        variant: "destructive"
      });
      return;
    }

    setSending(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-email-notification', {
        body: {
          recipientEmail: profile.email,
          subject: 'Test Email - Hall Booking System',
          body: `Hello ${profile.name}!\n\nThis is a test email from the Hall Booking System to verify that email notifications are working correctly.\n\nIf you received this email, the email service is functioning properly.`,
          notificationType: 'test_email',
          notificationData: {
            hall_name: 'Test Hall',
            event_date: new Date().toISOString().split('T')[0],
            start_time: '10:00',
            end_time: '12:00',
            event_name: 'Test Event',
            faculty_name: profile.name
          }
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Email Sent!",
        description: `Test email sent successfully to ${profile.email}`,
        variant: "default"
      });

    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast({
        title: "Email Failed",
        description: error.message || "Failed to send test email",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  if (profile?.role !== 'faculty') {
    return null; // Only show for faculty users in test mode
  }

  return (
    <Button
      onClick={sendTestEmail}
      disabled={sending}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <Mail className="h-4 w-4" />
      {sending ? "Sending..." : "Test Email"}
    </Button>
  );
};