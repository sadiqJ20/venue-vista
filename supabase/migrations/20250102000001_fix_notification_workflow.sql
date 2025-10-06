-- Fix hall booking approval and notification workflow
-- This migration corrects the notification flow and ensures proper approval/rejection handling

-- Step 1: Drop existing triggers to prevent conflicts
DO $$
BEGIN
    DROP TRIGGER IF EXISTS booking_status_change_unified_trigger ON public.bookings;
    DROP TRIGGER IF EXISTS new_booking_unified_trigger ON public.bookings;
    RAISE NOTICE 'Existing triggers dropped for workflow fix';
END $$;

-- Step 2: Create improved notification function with better message formatting
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
  IF booking_id_param IS NOT NULL AND type_param IN ('new_booking_request', 'approval_required', 'booking_approved', 'booking_rejected', 'hall_changed') THEN
    SELECT id INTO existing_notification_id
    FROM public.notifications 
    WHERE user_id = user_id_param 
      AND type = type_param 
      AND data->>'booking_id' = booking_id_param::text
      AND created_at > NOW() - INTERVAL '2 minutes';
    
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

-- Step 3: Create corrected new booking handler
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

-- Step 4: Create corrected booking status change handler with proper workflow
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
    -- Handle rejection first (this stops the workflow)
    IF NEW.status = 'rejected' THEN
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

      -- Send rejection notification to faculty
      IF faculty_user_id IS NOT NULL THEN
        PERFORM send_notification_unified(
          faculty_user_id,
          'Booking Request Rejected',
          'Your hall booking request has been rejected by ' || approver_role || ' — Reason: ' || rejection_reason_text,
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
      END IF;
      
      -- Rejection stops the workflow - no further notifications needed
      RETURN NEW;
    END IF;

    -- Handle approvals (these continue the workflow)
    CASE NEW.status
      WHEN 'pending_principal' THEN
        -- HOD approved - notify faculty and move to Principal
        SELECT user_id, email, name, 'HOD' INTO approver_user_id, approver_email, approver_name, approver_role
        FROM profiles 
        WHERE role = 'hod' AND department = NEW.department;
        
        -- Notify faculty of HOD approval
        IF faculty_user_id IS NOT NULL THEN
          PERFORM send_notification_unified(
            faculty_user_id,
            'Booking Request Update',
            'Your hall booking request has been approved by HOD.',
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
        
        -- Notify Principal for next approval
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

      WHEN 'pending_pro' THEN
        -- Principal approved - notify faculty and move to PRO
        SELECT user_id, email, name, 'Principal' INTO approver_user_id, approver_email, approver_name, approver_role
        FROM profiles 
        WHERE role = 'principal';
        
        -- Notify faculty of Principal approval
        IF faculty_user_id IS NOT NULL THEN
          PERFORM send_notification_unified(
            faculty_user_id,
            'Booking Request Update',
            'Your hall booking request has been approved by Principal.',
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
        
        -- Notify PRO for final approval
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

      WHEN 'approved' THEN
        -- PRO approved - final confirmation to faculty
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
        
        -- Notify faculty of final approval
        IF faculty_user_id IS NOT NULL THEN
          PERFORM send_notification_unified(
            faculty_user_id,
            'Booking Request Approved',
            'Your hall booking request has been approved by PRO. The hall is confirmed.',
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
        END IF;
    END CASE;
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

-- Step 5: Create the corrected triggers
DO $$
BEGIN
    -- Create trigger for new booking notifications
    CREATE TRIGGER new_booking_unified_trigger
        AFTER INSERT ON public.bookings
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_booking_unified();

    -- Create trigger for booking status change notifications
    CREATE TRIGGER booking_status_change_unified_trigger
        AFTER UPDATE ON public.bookings
        FOR EACH ROW EXECUTE FUNCTION public.handle_booking_status_change_unified();

    -- Recreate essential triggers for system functionality (only if they don't exist)
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'check_hall_availability_trigger' 
        AND tgrelid = 'public.bookings'::regclass
    ) THEN
        CREATE TRIGGER check_hall_availability_trigger
            BEFORE INSERT OR UPDATE ON public.bookings
            FOR EACH ROW EXECUTE FUNCTION public.check_hall_availability();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_bookings_updated_at' 
        AND tgrelid = 'public.bookings'::regclass
    ) THEN
        CREATE TRIGGER update_bookings_updated_at
            BEFORE UPDATE ON public.bookings
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
        
    RAISE NOTICE 'Corrected notification workflow triggers created successfully';
END $$;

-- Step 6: Clean up any existing duplicate notifications
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

-- Step 7: Create index for performance
CREATE INDEX IF NOT EXISTS idx_notifications_workflow_check 
ON public.notifications (user_id, type, (data->>'booking_id'), created_at DESC);

-- Notification workflow fix completed successfully
-- The corrected workflow now ensures:
-- 1. Faculty receives notification for each approval stage (HOD, Principal, PRO)
-- 2. Rejections stop the workflow immediately
-- 3. No duplicate notifications
-- 4. Proper message formatting as requested
