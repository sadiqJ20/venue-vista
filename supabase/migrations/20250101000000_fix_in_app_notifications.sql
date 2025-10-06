-- Fix in-app notification system for complete hall booking workflow
-- This migration ensures notifications are sent correctly at every stage

-- Update send_notification function to include all notification types for email
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
      url := 'https://yetmpnthnalztcxfqwnq.supabase.co/functions/v1/send-email-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'recipientEmail', user_email,
        'subject', title_param,
        'body', message_param,
        'notificationType', type_param,
        'notificationData', data_param
      )
    );
  END IF;

  RETURN notification_id;
END;
$$;

-- Enhanced new booking handler to ensure HOD gets immediate notification
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
  faculty_name TEXT;
  hall_name TEXT;
  email_subject TEXT;
  email_body TEXT;
BEGIN
  -- Get HOD user_id, email, and name for this department
  SELECT user_id, email, name INTO hod_user_id, hod_email, hod_name
  FROM profiles 
  WHERE role = 'hod' AND department = NEW.department;

  -- Get faculty email and name
  SELECT email, name INTO faculty_email, faculty_name
  FROM profiles 
  WHERE id = NEW.faculty_id;

  -- Get hall name
  SELECT name INTO hall_name 
  FROM halls 
  WHERE id = NEW.hall_id;

  -- Send notification to HOD immediately when faculty books a hall
  IF hod_user_id IS NOT NULL THEN
    email_subject := 'New Hall Booking Request - ' || hall_name;
    email_body := 'Dear ' || hod_name || ',

A new hall booking request requires your immediate approval.

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
      'New Booking Request',
      'New booking request from ' || NEW.faculty_name || ' for ' || hall_name || ' on ' || TO_CHAR(NEW.event_date, 'DD/MM/YYYY') || ' requires your approval',
      'new_booking_request',
      jsonb_build_object(
        'booking_id', NEW.id,
        'hall_name', hall_name,
        'event_date', NEW.event_date,
        'start_time', NEW.start_time,
        'end_time', NEW.end_time,
        'event_name', NEW.event_name,
        'faculty_name', NEW.faculty_name,
        'department', NEW.department,
        'attendees_count', NEW.attendees_count,
        'recipient_email', hod_email,
        'faculty_email', faculty_email
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Enhanced booking status change handler with complete notification flow
CREATE OR REPLACE FUNCTION public.handle_booking_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  faculty_user_id UUID;
  faculty_email TEXT;
  faculty_name TEXT;
  approver_user_id UUID;
  approver_role TEXT;
  approver_email TEXT;
  approver_name TEXT;
  hall_name TEXT;
  decision_text TEXT;
  rejection_reason_text TEXT;
  pro_comment TEXT;
  email_subject TEXT;
  email_body TEXT;
  next_approver_user_id UUID;
  next_approver_email TEXT;
  next_approver_name TEXT;
BEGIN
  -- Get faculty user_id, email, and name
  SELECT user_id, email, name INTO faculty_user_id, faculty_email, faculty_name
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
        -- Fetch latest PRO approval comment if any
        SELECT ba.reason INTO pro_comment
        FROM booking_approvals ba
        WHERE ba.booking_id = NEW.id
          AND ba.approver_id = approver_user_id
          AND ba.action = 'approved'
        ORDER BY ba.created_at DESC
        LIMIT 1;
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

    -- Send notification to faculty for all status changes
    IF faculty_user_id IS NOT NULL THEN
      IF NEW.status = 'rejected' THEN
        -- Rejection notification to faculty
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
          'Booking Request Rejected',
          'Your booking request for ' || hall_name || ' on ' || TO_CHAR(NEW.event_date, 'DD/MM/YYYY') || ' has been rejected by ' || approver_role || '. Reason: ' || rejection_reason_text,
          'booking_rejected',
          jsonb_build_object(
            'booking_id', NEW.id,
            'hall_name', hall_name,
            'event_date', NEW.event_date,
            'start_time', NEW.start_time,
            'end_time', NEW.end_time,
            'event_name', NEW.event_name,
            'faculty_name', NEW.faculty_name,
            'department', NEW.department,
            'decision_by', approver_name,
            'decision_role', approver_role,
            'rejection_reason', rejection_reason_text,
            'recipient_email', faculty_email,
            'approver_email', approver_email
          )
        );
      ELSIF NEW.status = 'approved' THEN
        -- Final approval notification to faculty
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
• Comments: ' || COALESCE(pro_comment, 'No additional comments') || '

Your hall booking is now confirmed! Please ensure you arrive on time and follow all hall usage guidelines.

Best regards,
Hall Booking System';
        
        PERFORM send_notification(
          faculty_user_id,
          'Booking Request Approved',
          'Your booking request for ' || hall_name || ' on ' || TO_CHAR(NEW.event_date, 'DD/MM/YYYY') || ' has been approved by ' || approver_role || '. Your hall is now confirmed!',
          'booking_approved',
          jsonb_build_object(
            'booking_id', NEW.id,
            'hall_name', hall_name,
            'event_date', NEW.event_date,
            'start_time', NEW.start_time,
            'end_time', NEW.end_time,
            'event_name', NEW.event_name,
            'faculty_name', NEW.faculty_name,
            'department', NEW.department,
            'decision_by', approver_name,
            'decision_role', approver_role,
            'approval_comments', COALESCE(pro_comment, 'No additional comments'),
            'recipient_email', faculty_email,
            'approver_email', approver_email
          )
        );
      ELSE
        -- Intermediate approval notification to faculty
        email_subject := 'Hall Booking Update - ' || hall_name || ' - ' || UPPER(REPLACE(NEW.status::text, '_', ' '));
        email_body := 'Dear ' || NEW.faculty_name || ',

Your booking request has been ' || decision_text || '.

BOOKING DETAILS:
• Hall: ' || hall_name || '
• Date: ' || TO_CHAR(NEW.event_date, 'DD/MM/YYYY') || '
• Time: ' || NEW.start_time || ' to ' || NEW.end_time || '
• Event: ' || NEW.event_name || '
• Department: ' || NEW.department || '

DECISION:
• Status: ' || UPPER(REPLACE(NEW.status::text, '_', ' ')) || '
• Decision taken by: ' || approver_name || ' (' || approver_role || ')

Your booking will proceed to the next approval stage.

Best regards,
Hall Booking System';
        
        PERFORM send_notification(
          faculty_user_id,
          'Booking Request Update',
          'Your booking request for ' || hall_name || ' on ' || TO_CHAR(NEW.event_date, 'DD/MM/YYYY') || ' has been ' || decision_text,
          'booking_approved',
          jsonb_build_object(
            'booking_id', NEW.id,
            'hall_name', hall_name,
            'event_date', NEW.event_date,
            'start_time', NEW.start_time,
            'end_time', NEW.end_time,
            'event_name', NEW.event_name,
            'faculty_name', NEW.faculty_name,
            'department', NEW.department,
            'decision_by', approver_name,
            'decision_role', approver_role,
            'status', NEW.status,
            'recipient_email', faculty_email,
            'approver_email', approver_email
          )
        );
      END IF;
    END IF;

    -- Send notifications to next approver in workflow
    IF NEW.status = 'pending_principal' THEN
      -- Notify Principal when HOD approves
      SELECT user_id, email, name INTO next_approver_user_id, next_approver_email, next_approver_name
      FROM profiles 
      WHERE role = 'principal';
      
      IF next_approver_user_id IS NOT NULL THEN
        email_subject := 'Hall Booking Approval Required - ' || hall_name;
        email_body := 'Dear ' || next_approver_name || ',

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
          next_approver_user_id,
          'Booking Approval Required',
          'New booking request for ' || hall_name || ' on ' || TO_CHAR(NEW.event_date, 'DD/MM/YYYY') || ' requires your approval',
          'approval_required',
          jsonb_build_object(
            'booking_id', NEW.id,
            'hall_name', hall_name,
            'event_date', NEW.event_date,
            'start_time', NEW.start_time,
            'end_time', NEW.end_time,
            'event_name', NEW.event_name,
            'faculty_name', NEW.faculty_name,
            'department', NEW.department,
            'attendees_count', NEW.attendees_count,
            'recipient_email', next_approver_email,
            'faculty_email', faculty_email
          )
        );
      END IF;
    ELSIF NEW.status = 'pending_pro' THEN
      -- Notify PRO when Principal approves
      SELECT user_id, email, name INTO next_approver_user_id, next_approver_email, next_approver_name
      FROM profiles 
      WHERE role = 'pro';
      
      IF next_approver_user_id IS NOT NULL THEN
        email_subject := 'Final Hall Booking Approval Required - ' || hall_name;
        email_body := 'Dear ' || next_approver_name || ',

A booking request requires final approval.

BOOKING DETAILS:
• Requester: ' || NEW.faculty_name || '
• Hall: ' || hall_name || '
• Date: ' || TO_CHAR(NEW.event_date, 'DD/MM/YYYY') || '
• Time: ' || NEW.start_time || ' to ' || NEW.end_time || '
• Event: ' || NEW.event_name || '
• Department: ' || NEW.department || '
• Attendees: ' || NEW.attendees_count || '

This booking has been approved by the Principal and now requires your final approval.

This is the final approval stage. Please review and approve/reject this booking request.

Best regards,
Hall Booking System';
        
        PERFORM send_notification(
          next_approver_user_id,
          'Final Booking Approval Required',
          'Booking request for ' || hall_name || ' on ' || TO_CHAR(NEW.event_date, 'DD/MM/YYYY') || ' requires final approval',
          'approval_required',
          jsonb_build_object(
            'booking_id', NEW.id,
            'hall_name', hall_name,
            'event_date', NEW.event_date,
            'start_time', NEW.start_time,
            'end_time', NEW.end_time,
            'event_name', NEW.event_name,
            'faculty_name', NEW.faculty_name,
            'department', NEW.department,
            'attendees_count', NEW.attendees_count,
            'recipient_email', next_approver_email,
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
        'Hall Assignment Changed',
        'Your booking has been moved from ' || old_hall_name || ' to ' || new_hall_name || ' by ' || changer_name || '. Reason: ' || COALESCE(NEW.hall_change_reason, 'No reason provided'),
        'hall_changed',
        jsonb_build_object(
          'booking_id', NEW.id,
          'old_hall_name', old_hall_name,
          'new_hall_name', new_hall_name,
          'changed_by', changer_name,
          'reason', NEW.hall_change_reason,
          'event_date', NEW.event_date,
          'recipient_email', faculty_email,
          'changer_email', changer_email
        )
      );
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure triggers are properly set up
DO $$
BEGIN
    -- Recreate trigger for new booking notifications
    DROP TRIGGER IF EXISTS handle_new_booking_trigger ON public.bookings;
    CREATE TRIGGER handle_new_booking_trigger
        AFTER INSERT ON public.bookings
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_booking();

    -- Recreate trigger for booking status change notifications
    DROP TRIGGER IF EXISTS handle_booking_status_change_trigger ON public.bookings;
    CREATE TRIGGER handle_booking_status_change_trigger
        AFTER UPDATE ON public.bookings
        FOR EACH ROW EXECUTE FUNCTION public.handle_booking_status_change();
        
    RAISE NOTICE 'All notification triggers have been recreated successfully';
END $$;

