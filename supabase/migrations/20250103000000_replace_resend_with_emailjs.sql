-- Replace Resend-based email notifications with EmailJS
-- This migration updates the notification system to use EmailJS instead of Resend

-- Update the send_notification function to use EmailJS
CREATE OR REPLACE FUNCTION public.send_notification(
  user_id_param uuid,
  title_param text,
  message_param text,
  type_param text,
  data_param jsonb DEFAULT NULL::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
  user_email TEXT;
  should_send_email BOOLEAN := false;
  has_pg_net BOOLEAN := false;
BEGIN
  -- Insert in-app notification
  INSERT INTO public.notifications (user_id, title, message, type, data)
  VALUES (user_id_param, title_param, message_param, type_param, data_param)
  RETURNING id INTO notification_id;

  -- Get user email from profiles
  SELECT email INTO user_email 
  FROM profiles 
  WHERE user_id = user_id_param;

  -- Determine if email should be sent based on notification type
  should_send_email := type_param IN (
    'booking_approved', 
    'booking_rejected', 
    'approval_required', 
    'hall_changed',
    'new_booking_request'
  );

  -- Check if pg_net (schema "net") is installed to avoid runtime errors
  SELECT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'net'
  ) INTO has_pg_net;

  -- Send email notification if applicable and pg_net is available
  IF should_send_email AND user_email IS NOT NULL AND has_pg_net THEN
    PERFORM net.http_post(
      url := 'https://yetmpnthnalztcxfqwnq.supabase.co/functions/v1/send-emailjs-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'recipientEmail', user_email,
        'subject', title_param,
        'message', message_param,
        'notificationType', type_param,
        'notificationData', data_param
      )
    );
  END IF;

  RETURN notification_id;
END;
$$;

-- Enhanced booking status change handler with EmailJS templates
CREATE OR REPLACE FUNCTION public.handle_booking_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  faculty_user_id UUID;
  faculty_email TEXT;
  approver_user_id UUID;
  approver_role TEXT;
  approver_email TEXT;
  approver_name TEXT;
  hall_name TEXT;
  decision_text TEXT;
  rejection_reason_text TEXT;
  email_subject TEXT;
  email_body TEXT;
BEGIN
  -- Get faculty user_id and email
  SELECT user_id, email INTO faculty_user_id, faculty_email
  FROM profiles 
  WHERE id = NEW.faculty_id;

  -- Get hall name
  SELECT name INTO hall_name 
  FROM halls 
  WHERE id = NEW.hall_id;

  -- Handle status change notifications
  IF NEW.status != OLD.status THEN
    -- Determine decision text and get approver info
    CASE NEW.status
      WHEN 'pending_principal' THEN
        decision_text := 'approved by HOD';
        SELECT user_id, email, name, 'HOD' INTO approver_user_id, approver_email, approver_name, approver_role
        FROM profiles 
        WHERE role = 'hod' AND department = NEW.department;
      WHEN 'pending_pro' THEN
        decision_text := 'approved by Principal';
        SELECT user_id, email, name, 'Principal' INTO approver_user_id, approver_email, approver_name, approver_role
        FROM profiles 
        WHERE role = 'principal';
      WHEN 'approved' THEN
        decision_text := 'approved by PRO';
        SELECT user_id, email, name, 'PRO' INTO approver_user_id, approver_email, approver_name, approver_role
        FROM profiles 
        WHERE role = 'pro';
      WHEN 'rejected' THEN
        decision_text := 'rejected';
        rejection_reason_text := COALESCE(NEW.rejection_reason, 'No reason provided');
        -- Determine who rejected based on previous status
        CASE OLD.status
          WHEN 'pending_hod' THEN
            SELECT user_id, email, name, 'HOD' INTO approver_user_id, approver_email, approver_name, approver_role
            FROM profiles 
            WHERE role = 'hod' AND department = NEW.department;
          WHEN 'pending_principal' THEN
            SELECT user_id, email, name, 'Principal' INTO approver_user_id, approver_email, approver_name, approver_role
            FROM profiles 
            WHERE role = 'principal';
          WHEN 'pending_pro' THEN
            SELECT user_id, email, name, 'PRO' INTO approver_user_id, approver_email, approver_name, approver_role
            FROM profiles 
            WHERE role = 'pro';
        END CASE;
    END CASE;

    -- Send notification to faculty
    IF faculty_user_id IS NOT NULL THEN
      IF NEW.status = 'rejected' THEN
        -- Rejection email to faculty
        email_subject := 'Hall Booking Request Rejected - ' || hall_name;
        email_body := 'Dear ' || NEW.faculty_name || ',

Your hall booking request has been rejected.

BOOKING DETAILS:
• Hall: ' || hall_name || '
• Date: ' || TO_CHAR(NEW.event_date, 'DD/MM/YYYY') || '
• Time: ' || NEW.start_time || ' to ' || NEW.end_time || '
• Event: ' || NEW.event_name || '
• Department: ' || NEW.department || '

DECISION:
• Status: Rejected
• Decision taken by: ' || approver_name || ' (' || approver_role || ')
• Reason: ' || rejection_reason_text || '

Please contact the ' || approver_role || ' for more information or to submit a new request.

Best regards,
Hall Booking System';
        
        PERFORM send_notification(
          faculty_user_id,
          email_subject,
          email_body,
          'booking_rejected',
          jsonb_build_object(
            'booking_id', NEW.id,
            'hall_name', hall_name,
            'event_date', NEW.event_date,
            'start_time', NEW.start_time,
            'end_time', NEW.end_time,
            'event_name', NEW.event_name,
            'faculty_name', NEW.faculty_name,
            'faculty_phone', NEW.faculty_phone,
            'department', NEW.department,
            'hod_name', NEW.hod_name,
            'decision_by', approver_name,
            'decision_role', approver_role,
            'rejection_reason', rejection_reason_text,
            'recipient_email', faculty_email,
            'approver_email', approver_email,
            'attendees_count', NEW.attendees_count
          )
        );
      ELSIF NEW.status = 'approved' THEN
        -- Final approval email to faculty
        email_subject := 'Your Hall is Booked Successfully!';
        email_body := 'Dear ' || NEW.faculty_name || ',

Congratulations! Your hall booking has been approved and confirmed.

BOOKING DETAILS:
• Hall: ' || hall_name || '
• Date: ' || TO_CHAR(NEW.event_date, 'DD/MM/YYYY') || '
• Time: ' || NEW.start_time || ' to ' || NEW.end_time || '
• Event: ' || NEW.event_name || '
• Department: ' || NEW.department || '

DECISION:
• Status: Accepted
• Decision taken by: ' || approver_name || ' (' || approver_role || ')
• Comments: ' || COALESCE(NEW.approval_comments, 'No additional comments') || '

Your hall booking is now confirmed! Please ensure you arrive on time and follow all hall usage guidelines.

Best regards,
Hall Booking System';
        
        PERFORM send_notification(
          faculty_user_id,
          email_subject,
          email_body,
          'booking_approved',
          jsonb_build_object(
            'booking_id', NEW.id,
            'hall_name', hall_name,
            'event_date', NEW.event_date,
            'start_time', NEW.start_time,
            'end_time', NEW.end_time,
            'event_name', NEW.event_name,
            'faculty_name', NEW.faculty_name,
            'faculty_phone', NEW.faculty_phone,
            'department', NEW.department,
            'hod_name', NEW.hod_name,
            'decision_by', approver_name,
            'decision_role', approver_role,
            'approval_comments', NEW.approval_comments,
            'recipient_email', faculty_email,
            'approver_email', approver_email,
            'attendees_count', NEW.attendees_count
          )
        );
      END IF;
    END IF;

    -- Send notifications to next approver in workflow
    IF NEW.status = 'pending_principal' THEN
      -- Notify Principal
      SELECT user_id, email, name INTO approver_user_id, approver_email, approver_name
      FROM profiles 
      WHERE role = 'principal';
      
      IF approver_user_id IS NOT NULL THEN
        email_subject := 'Hall Booking Approval Required - ' || hall_name;
        email_body := 'Dear ' || approver_name || ',

A new hall booking request requires your approval.

BOOKING DETAILS:
• Requester: ' || NEW.faculty_name || '
• Hall: ' || hall_name || '
• Date: ' || TO_CHAR(NEW.event_date, 'DD/MM/YYYY') || '
• Time: ' || NEW.start_time || ' to ' || NEW.end_time || '
• Event: ' || NEW.event_name || '
• Department: ' || NEW.department || '
• Attendees: ' || NEW.attendees_count || '

This booking has been approved by the HOD and now requires your approval.

Please review and approve/reject this booking request in the system.

Best regards,
Hall Booking System';
        
        PERFORM send_notification(
          approver_user_id,
          email_subject,
          email_body,
          'approval_required',
          jsonb_build_object(
            'booking_id', NEW.id,
            'hall_name', hall_name,
            'event_date', NEW.event_date,
            'start_time', NEW.start_time,
            'end_time', NEW.end_time,
            'event_name', NEW.event_name,
            'faculty_name', NEW.faculty_name,
            'faculty_phone', NEW.faculty_phone,
            'department', NEW.department,
            'hod_name', NEW.hod_name,
            'attendees_count', NEW.attendees_count,
            'recipient_email', approver_email,
            'faculty_email', faculty_email
          )
        );
      END IF;
    ELSIF NEW.status = 'pending_pro' THEN
      -- Notify PRO
      SELECT user_id, email, name INTO approver_user_id, approver_email, approver_name
      FROM profiles 
      WHERE role = 'pro';
      
      IF approver_user_id IS NOT NULL THEN
        email_subject := 'Final Hall Booking Approval Required - ' || hall_name;
        email_body := 'Dear ' || approver_name || ',

A booking request requires final approval.

BOOKING DETAILS:
• Requester: ' || NEW.faculty_name || '
• Hall: ' || hall_name || '
• Date: ' || TO_CHAR(NEW.event_date, 'DD/MM/YYYY') || '
• Time: ' || NEW.start_time || ' to ' || NEW.end_time || '
• Event: ' || NEW.event_name || '
• Department: ' || NEW.department || '
• Attendees: ' || NEW.attendees_count || '

This booking has been approved by both HOD and Principal. This is the final approval stage.

Please review and approve/reject this booking request in the system.

Best regards,
Hall Booking System';
        
        PERFORM send_notification(
          approver_user_id,
          email_subject,
          email_body,
          'approval_required',
          jsonb_build_object(
            'booking_id', NEW.id,
            'hall_name', hall_name,
            'event_date', NEW.event_date,
            'start_time', NEW.start_time,
            'end_time', NEW.end_time,
            'event_name', NEW.event_name,
            'faculty_name', NEW.faculty_name,
            'faculty_phone', NEW.faculty_phone,
            'department', NEW.department,
            'hod_name', NEW.hod_name,
            'attendees_count', NEW.attendees_count,
            'recipient_email', approver_email,
            'faculty_email', faculty_email
          )
        );
      END IF;
    END IF;
  END IF;

  -- Handle hall change notifications
  IF NEW.hall_id != OLD.hall_id THEN
    DECLARE
      old_hall_name TEXT;
      new_hall_name TEXT;
      changer_name TEXT;
      changer_email TEXT;
    BEGIN
      SELECT name INTO old_hall_name FROM halls WHERE id = OLD.hall_id;
      SELECT name INTO new_hall_name FROM halls WHERE id = NEW.hall_id;
      SELECT name, email INTO changer_name, changer_email FROM profiles WHERE id = NEW.hall_changed_by;
      
      email_subject := 'Hall Assignment Changed - ' || old_hall_name || ' to ' || new_hall_name;
      email_body := 'Dear ' || NEW.faculty_name || ',

Your hall booking has been changed.

BOOKING DETAILS:
• Event: ' || NEW.event_name || '
• Date: ' || TO_CHAR(NEW.event_date, 'DD/MM/YYYY') || '
• Time: ' || NEW.start_time || ' to ' || NEW.end_time || '

HALL CHANGE:
• From: ' || old_hall_name || '
• To: ' || new_hall_name || '
• Changed by: ' || changer_name || '
• Reason: ' || COALESCE(NEW.hall_change_reason, 'No reason provided') || '

Please note this change for your event planning.

Best regards,
Hall Booking System';
      
      PERFORM send_notification(
        faculty_user_id,
        email_subject,
        email_body,
        'hall_changed',
        jsonb_build_object(
          'booking_id', NEW.id,
          'old_hall_name', old_hall_name,
          'new_hall_name', new_hall_name,
          'changed_by', changer_name,
          'reason', NEW.hall_change_reason,
          'event_date', NEW.event_date,
          'event_name', NEW.event_name,
          'start_time', NEW.start_time,
          'end_time', NEW.end_time,
          'faculty_name', NEW.faculty_name,
          'faculty_phone', NEW.faculty_phone,
          'department', NEW.department,
          'hod_name', NEW.hod_name,
          'recipient_email', faculty_email,
          'changer_email', changer_email
        )
      );
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- Enhanced new booking handler with HOD notification using EmailJS
CREATE OR REPLACE FUNCTION public.handle_new_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  hod_user_id UUID;
  hod_email TEXT;
  hod_name TEXT;
  faculty_email TEXT;
  hall_name TEXT;
  email_subject TEXT;
  email_body TEXT;
BEGIN
  -- Get HOD user_id, email, and name for this department
  SELECT user_id, email, name INTO hod_user_id, hod_email, hod_name
  FROM profiles 
  WHERE role = 'hod' AND department = NEW.department;

  -- Get faculty email
  SELECT email INTO faculty_email
  FROM profiles 
  WHERE id = NEW.faculty_id;

  -- Get hall name
  SELECT name INTO hall_name 
  FROM halls 
  WHERE id = NEW.hall_id;

  -- Send notification to HOD
  IF hod_user_id IS NOT NULL THEN
    email_subject := 'New Hall Booking Request - ' || hall_name;
    email_body := 'Dear ' || hod_name || ',

A new hall booking request requires your approval.

BOOKING DETAILS:
• Requester: ' || NEW.faculty_name || '
• Hall: ' || hall_name || '
• Date: ' || TO_CHAR(NEW.event_date, 'DD/MM/YYYY') || '
• Time: ' || NEW.start_time || ' to ' || NEW.end_time || '
• Event: ' || NEW.event_name || '
• Department: ' || NEW.department || '
• Attendees: ' || NEW.attendees_count || '

Please review and approve/reject this booking request in the system.

Best regards,
Hall Booking System';
    
    PERFORM send_notification(
      hod_user_id,
      email_subject,
      email_body,
      'new_booking_request',
      jsonb_build_object(
        'booking_id', NEW.id,
        'hall_name', hall_name,
        'event_date', NEW.event_date,
        'start_time', NEW.start_time,
        'end_time', NEW.end_time,
        'event_name', NEW.event_name,
        'faculty_name', NEW.faculty_name,
        'faculty_phone', NEW.faculty_phone,
        'department', NEW.department,
        'hod_name', NEW.hod_name,
        'attendees_count', NEW.attendees_count,
        'recipient_email', hod_email,
        'faculty_email', faculty_email
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;
