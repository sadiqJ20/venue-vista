-- Guard the use of pg_net (schema "net") so submissions don't fail when it's absent
-- This replaces send_notification to no-op the HTTP call if the schema isn't installed
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
    'hall_changed'
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
        'subject', 'Hall Booking Update - ' || title_param,
        'body', message_param,
        'notificationType', type_param,
        'notificationData', data_param
      )
    );
  END IF;

  RETURN notification_id;
END;
$$;

-- Fix REPLACE function error with booking_status enum
-- Cast the enum to text before using REPLACE function
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
        SELECT user_id, email, 'HOD' INTO approver_user_id, approver_email, approver_role
        FROM profiles 
        WHERE role = 'hod' AND department = NEW.department;
      WHEN 'pending_pro' THEN
        decision_text := 'approved by Principal';
        SELECT user_id, email, 'Principal' INTO approver_user_id, approver_email, approver_role
        FROM profiles 
        WHERE role = 'principal';
      WHEN 'approved' THEN
        decision_text := 'approved by PRO';
        SELECT user_id, email, 'PRO' INTO approver_user_id, approver_email, approver_role
        FROM profiles 
        WHERE role = 'pro';
      WHEN 'rejected' THEN
        decision_text := 'rejected';
        rejection_reason_text := COALESCE(NEW.rejection_reason, 'No reason provided');
        -- Determine who rejected based on previous status
        CASE OLD.status
          WHEN 'pending_hod' THEN
            SELECT user_id, email, 'HOD' INTO approver_user_id, approver_email, approver_role
            FROM profiles 
            WHERE role = 'hod' AND department = NEW.department;
          WHEN 'pending_principal' THEN
            SELECT user_id, email, 'Principal' INTO approver_user_id, approver_email, approver_role
            FROM profiles 
            WHERE role = 'principal';
          WHEN 'pending_pro' THEN
            SELECT user_id, email, 'PRO' INTO approver_user_id, approver_email, approver_role
            FROM profiles 
            WHERE role = 'pro';
        END CASE;
    END CASE;

    -- Send notification to faculty
    IF faculty_user_id IS NOT NULL THEN
      IF NEW.status = 'rejected' THEN
        email_subject := format('Hall Booking Rejected - %s', hall_name);
        email_body := format('Your booking request for %s on %s from %s to %s has been rejected by %s.\n\nReason: %s\n\nBooking Details:\n- Event: %s\n- Faculty: %s\n\nPlease contact the %s for more information.',
          hall_name, 
          TO_CHAR(NEW.event_date, 'DD/MM/YYYY'),
          NEW.start_time,
          NEW.end_time,
          approver_role, 
          rejection_reason_text,
          NEW.event_name,
          NEW.faculty_name,
          approver_role
        );
        
        PERFORM send_notification(
          faculty_user_id,
          'Booking Request Rejected',
          format('Your booking request for %s on %s has been %s by %s. Reason: %s',
            hall_name, NEW.event_date, decision_text, approver_role, rejection_reason_text),
          'booking_rejected',
          jsonb_build_object(
            'booking_id', NEW.id,
            'hall_name', hall_name,
            'event_date', NEW.event_date,
            'start_time', NEW.start_time,
            'end_time', NEW.end_time,
            'decision_by', approver_role,
            'rejection_reason', rejection_reason_text,
            'recipient_email', faculty_email,
            'approver_email', approver_email,
            'email_subject', email_subject,
            'email_body', email_body
          )
        );
      ELSE
        -- Fix: Cast enum to text before using REPLACE
        email_subject := format('Hall Booking Update - %s - %s', hall_name, UPPER(REPLACE(NEW.status::text, '_', ' ')));
        email_body := format('Your booking request for %s has been %s.\n\nBooking Details:\n- Hall: %s\n- Date: %s\n- Time: %s to %s\n- Event: %s\n- Status: %s\n\n%s',
          hall_name,
          decision_text,
          hall_name,
          TO_CHAR(NEW.event_date, 'DD/MM/YYYY'),
          NEW.start_time,
          NEW.end_time,
          NEW.event_name,
          UPPER(REPLACE(NEW.status::text, '_', ' ')),
          CASE 
            WHEN NEW.status = 'approved' THEN 'Your hall booking is now confirmed!'
            ELSE 'Your booking will proceed to the next approval stage.'
          END
        );
        
        PERFORM send_notification(
          faculty_user_id,
          'Booking Request Update',
          format('Your booking request for %s on %s has been %s',
            hall_name, NEW.event_date, decision_text),
          'booking_approved',
          jsonb_build_object(
            'booking_id', NEW.id,
            'hall_name', hall_name,
            'event_date', NEW.event_date,
            'start_time', NEW.start_time,
            'end_time', NEW.end_time,
            'decision_by', approver_role,
            'status', NEW.status,
            'recipient_email', faculty_email,
            'approver_email', approver_email,
            'email_subject', email_subject,
            'email_body', email_body
          )
        );
      END IF;
    END IF;

    -- Send notifications to next approver in workflow
    IF NEW.status = 'pending_principal' THEN
      -- Notify Principal
      SELECT user_id, email INTO approver_user_id, approver_email
      FROM profiles 
      WHERE role = 'principal';
      
      IF approver_user_id IS NOT NULL THEN
        email_subject := format('Hall Booking Approval Required - %s', hall_name);
        email_body := format('A new booking request requires your approval.\n\nBooking Details:\n- Requester: %s\n- Hall: %s\n- Date: %s\n- Time: %s to %s\n- Event: %s\n- Department: %s\n\nPlease review and approve/reject this booking request.',
          NEW.faculty_name,
          hall_name,
          TO_CHAR(NEW.event_date, 'DD/MM/YYYY'),
          NEW.start_time,
          NEW.end_time,
          NEW.event_name,
          NEW.department
        );
        
        PERFORM send_notification(
          approver_user_id,
          'Booking Approval Required',
          format('New booking request for %s on %s requires your approval',
            hall_name, NEW.event_date),
          'approval_required',
          jsonb_build_object(
            'booking_id', NEW.id,
            'hall_name', hall_name,
            'event_date', NEW.event_date,
            'faculty_name', NEW.faculty_name,
            'event_name', NEW.event_name,
            'recipient_email', approver_email,
            'faculty_email', faculty_email,
            'email_subject', email_subject,
            'email_body', email_body
          )
        );
      END IF;
    ELSIF NEW.status = 'pending_pro' THEN
      -- Notify PRO
      SELECT user_id, email INTO approver_user_id, approver_email
      FROM profiles 
      WHERE role = 'pro';
      
      IF approver_user_id IS NOT NULL THEN
        email_subject := format('Final Hall Booking Approval Required - %s', hall_name);
        email_body := format('A booking request requires final approval.\n\nBooking Details:\n- Requester: %s\n- Hall: %s\n- Date: %s\n- Time: %s to %s\n- Event: %s\n- Department: %s\n\nThis is the final approval stage. Please review and approve/reject this booking request.',
          NEW.faculty_name,
          hall_name,
          TO_CHAR(NEW.event_date, 'DD/MM/YYYY'),
          NEW.start_time,
          NEW.end_time,
          NEW.event_name,
          NEW.department
        );
        
        PERFORM send_notification(
          approver_user_id,
          'Final Booking Approval Required',
          format('Booking request for %s on %s requires final approval',
            hall_name, NEW.event_date),
          'approval_required',
          jsonb_build_object(
            'booking_id', NEW.id,
            'hall_name', hall_name,
            'event_date', NEW.event_date,
            'faculty_name', NEW.faculty_name,
            'event_name', NEW.event_name,
            'recipient_email', approver_email,
            'faculty_email', faculty_email,
            'email_subject', email_subject,
            'email_body', email_body
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
      
      email_subject := format('Hall Assignment Changed - %s to %s', old_hall_name, new_hall_name);
      email_body := format('Your hall booking has been changed.\n\nBooking Details:\n- Event: %s\n- Date: %s\n- Time: %s to %s\n\nHall Change:\n- From: %s\n- To: %s\n- Changed by: %s\n- Reason: %s\n\nPlease note this change for your event planning.',
        NEW.event_name,
        TO_CHAR(NEW.event_date, 'DD/MM/YYYY'),
        NEW.start_time,
        NEW.end_time,
        old_hall_name,
        new_hall_name,
        changer_name,
        COALESCE(NEW.hall_change_reason, 'No reason provided')
      );
      
      PERFORM send_notification(
        faculty_user_id,
        'Hall Assignment Changed',
        format('Your booking has been moved from %s to %s by %s. Reason: %s',
          old_hall_name, new_hall_name, changer_name, COALESCE(NEW.hall_change_reason, 'No reason provided')),
        'hall_changed',
        jsonb_build_object(
          'booking_id', NEW.id,
          'old_hall_name', old_hall_name,
          'new_hall_name', new_hall_name,
          'changed_by', changer_name,
          'reason', NEW.hall_change_reason,
          'event_date', NEW.event_date,
          'recipient_email', faculty_email,
          'changer_email', changer_email,
          'email_subject', email_subject,
          'email_body', email_body
        )
      );
    END;
  END IF;

  RETURN NEW;
END;
$function$;


