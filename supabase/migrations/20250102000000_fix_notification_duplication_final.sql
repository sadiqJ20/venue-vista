-- Final fix for notification duplication issue
-- This migration ensures only one notification is sent per approval action

-- Step 1: Drop ALL existing triggers to prevent duplicates
DO $$
BEGIN
    -- Drop all booking-related triggers
    DROP TRIGGER IF EXISTS booking_status_change_trigger ON public.bookings;
    DROP TRIGGER IF EXISTS handle_booking_status_change_trigger ON public.bookings;
    DROP TRIGGER IF EXISTS booking_status_change_single_trigger ON public.bookings;
    DROP TRIGGER IF EXISTS new_booking_notification_trigger ON public.bookings;
    DROP TRIGGER IF EXISTS handle_new_booking_trigger ON public.bookings;
    DROP TRIGGER IF EXISTS new_booking_single_trigger ON public.bookings;
    DROP TRIGGER IF EXISTS check_hall_availability_trigger ON public.bookings;
    DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
    
    RAISE NOTICE 'All existing booking triggers have been dropped';
END $$;

-- Step 2: Create a unified notification function with duplicate prevention
CREATE OR REPLACE FUNCTION public.send_notification_unified(
  user_id_param uuid,
  title_param text,
  message_param text,
  type_param text,
  data_param jsonb DEFAULT NULL::jsonb,
  booking_id_param uuid DEFAULT NULL
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
  existing_notification_id UUID;
BEGIN
  -- Check for existing notification to prevent duplicates
  -- Only check for booking-related notifications to avoid blocking legitimate duplicates
  IF booking_id_param IS NOT NULL AND type_param IN ('new_booking_request', 'approval_required', 'booking_approved', 'booking_rejected', 'hall_changed') THEN
    SELECT id INTO existing_notification_id
    FROM public.notifications 
    WHERE user_id = user_id_param 
      AND type = type_param 
      AND data->>'booking_id' = booking_id_param::text
      AND created_at > NOW() - INTERVAL '2 minutes'; -- Check within last 2 minutes
    
    -- If duplicate found within last 2 minutes, return existing notification ID
    IF existing_notification_id IS NOT NULL THEN
      RAISE NOTICE 'Duplicate notification prevented for user % booking % type %', user_id_param, booking_id_param, type_param;
      RETURN existing_notification_id;
    END IF;
  END IF;

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

-- Step 3: Create a single, comprehensive new booking handler
CREATE OR REPLACE FUNCTION public.handle_new_booking_unified()
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
    PERFORM send_notification_unified(
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
      ),
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Step 4: Create a single, comprehensive booking status change handler
CREATE OR REPLACE FUNCTION public.handle_booking_status_change_unified()
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
        PERFORM send_notification_unified(
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
          ),
          NEW.id
        );
      ELSIF NEW.status = 'approved' THEN
        -- Final approval notification to faculty
        PERFORM send_notification_unified(
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
          ),
          NEW.id
        );
      ELSE
        -- Intermediate approval notification to faculty
        PERFORM send_notification_unified(
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
          ),
          NEW.id
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
        PERFORM send_notification_unified(
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
          ),
          NEW.id
        );
      END IF;
    ELSIF NEW.status = 'pending_pro' THEN
      -- Notify PRO when Principal approves
      SELECT user_id, email, name INTO next_approver_user_id, next_approver_email, next_approver_name
      FROM profiles 
      WHERE role = 'pro';
      
      IF next_approver_user_id IS NOT NULL THEN
        PERFORM send_notification_unified(
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
          ),
          NEW.id
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
      
      PERFORM send_notification_unified(
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
        ),
        NEW.id
      );
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- Step 5: Create essential triggers only (no duplicates)
DO $$
BEGIN
    -- Create trigger for new booking notifications (single trigger)
    CREATE TRIGGER new_booking_unified_trigger
        AFTER INSERT ON public.bookings
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_booking_unified();

    -- Create trigger for booking status change notifications (single trigger)
    CREATE TRIGGER booking_status_change_unified_trigger
        AFTER UPDATE ON public.bookings
        FOR EACH ROW EXECUTE FUNCTION public.handle_booking_status_change_unified();

    -- Recreate essential triggers for system functionality
    CREATE TRIGGER check_hall_availability_trigger
        BEFORE INSERT OR UPDATE ON public.bookings
        FOR EACH ROW EXECUTE FUNCTION public.check_hall_availability();

    CREATE TRIGGER update_bookings_updated_at
        BEFORE UPDATE ON public.bookings
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
        
    RAISE NOTICE 'All unified notification triggers have been created successfully';
END $$;

-- Step 6: Clean up old functions to prevent confusion
DROP FUNCTION IF EXISTS public.handle_new_booking();
DROP FUNCTION IF EXISTS public.handle_new_booking_single();
DROP FUNCTION IF EXISTS public.handle_booking_status_change();
DROP FUNCTION IF EXISTS public.handle_booking_status_change_single();
DROP FUNCTION IF EXISTS public.send_notification(uuid, text, text, text, jsonb);
DROP FUNCTION IF EXISTS public.send_notification_unique(uuid, text, text, text, jsonb, uuid);

-- Step 7: Clean up existing duplicate notifications in the database
-- Remove duplicate notifications that have the same booking_id, type, and user_id within a short time window
DELETE FROM public.notifications 
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (
             PARTITION BY user_id, type, data->>'booking_id' 
             ORDER BY created_at DESC
           ) as rn
    FROM public.notifications 
    WHERE data->>'booking_id' IS NOT NULL 
      AND type IN ('new_booking_request', 'approval_required', 'booking_approved', 'booking_rejected', 'hall_changed')
      AND created_at > NOW() - INTERVAL '24 hours'
  ) t 
  WHERE rn > 1
);

-- Step 8: Create index to improve duplicate detection performance
CREATE INDEX IF NOT EXISTS idx_notifications_duplicate_check_unified 
ON public.notifications (user_id, type, (data->>'booking_id'), created_at DESC);

-- Step 9: Create a function to manually clean up duplicates if needed
CREATE OR REPLACE FUNCTION public.cleanup_duplicate_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.notifications 
  WHERE id IN (
    SELECT id FROM (
      SELECT id, 
             ROW_NUMBER() OVER (
               PARTITION BY user_id, type, data->>'booking_id' 
               ORDER BY created_at DESC
             ) as rn
      FROM public.notifications 
      WHERE data->>'booking_id' IS NOT NULL 
        AND type IN ('new_booking_request', 'approval_required', 'booking_approved', 'booking_rejected', 'hall_changed')
    ) t 
    WHERE rn > 1
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Step 10: Add notification message formatting as requested
-- Update the notification messages to match the expected format
CREATE OR REPLACE FUNCTION public.format_approval_notification_message(
  hall_name TEXT,
  event_date DATE,
  start_time TIME,
  end_time TIME,
  approver_role TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'Booking Approval Required — Booking request for ' || hall_name || ' on ' || TO_CHAR(event_date, 'DD/MM/YYYY') || ' at ' || start_time || ' approved by ' || approver_role || '.';
END;
$$;

-- Notification duplication fix completed successfully
-- All duplicate triggers and functions have been removed and replaced with unified versions
