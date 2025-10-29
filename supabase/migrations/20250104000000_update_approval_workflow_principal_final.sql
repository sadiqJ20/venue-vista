-- Update approval workflow to make Principal the final approver
-- This migration modifies the booking status change handler to reflect the new workflow:
-- Faculty → HOD → Principal (Final approval) - PRO no longer approves

-- Step 1: Update the booking status change handler function
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

      WHEN 'approved' THEN
        -- Principal approved - final confirmation to faculty (Principal is now final approver)
        SELECT user_id, email, name, 'Principal' INTO approver_user_id, approver_email, approver_name, approver_role
        FROM profiles 
        WHERE role = 'principal';
        
        -- Notify faculty of final approval by Principal
        IF faculty_user_id IS NOT NULL THEN
          PERFORM send_notification_unified(
            faculty_user_id,
            'Booking Request Update',
            'Dear Faculty,\n\nThe following booking request update has been made:\n\nFaculty Name: ' || NEW.faculty_name || '\nFaculty Contact: ' || COALESCE(NEW.faculty_phone, '-') || '\nDepartment: ' || NEW.department || '\nHall Name: ' || hall_name || '\nEvent Name: ' || NEW.event_name || '\nBooking Date & Time: ' || TO_CHAR(NEW.event_date, 'DD/MM/YYYY') || ' from ' || NEW.start_time || ' to ' || NEW.end_time || '\nDecision: Approved\nDecision Taken By: Principal\nComments: Your booking request has been fully approved. This is the final approval stage.\n\nYou can view or manage this booking by clicking the link below:\n[Go to Seminar Hall System]\n\nThank you,\nInnovatorsHub Team',
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
              'recipient_email', faculty_email,
              'approver_email', approver_email
            ),
            NEW.id
          );
        END IF;

        -- Also inform PRO for offline action (no approval needed)
        SELECT user_id, email, name INTO next_approver_user_id, next_approver_email, next_approver_name
        FROM profiles 
        WHERE role = 'pro';

        IF next_approver_user_id IS NOT NULL THEN
          PERFORM send_notification_unified(
            next_approver_user_id,
            'Booking Request Update',
            'Dear PRO,\n\nThe following booking request update has been made:\n\nFaculty Name: ' || NEW.faculty_name || '\nFaculty Contact: ' || COALESCE(NEW.faculty_phone, '-') || '\nDepartment: ' || NEW.department || '\nHall Name: ' || hall_name || '\nEvent Name: ' || NEW.event_name || '\nBooking Date & Time: ' || TO_CHAR(NEW.event_date, 'DD/MM/YYYY') || ' from ' || NEW.start_time || ' to ' || NEW.end_time || '\nDecision: Approved\nDecision Taken By: Principal\nComments: This booking has been approved by both HOD and Principal.\n\nYou can view or manage this booking by clicking the link below:\n[Go to Seminar Hall System]\n\nThank you,\nInnovatorsHub Team',
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
              'recipient_email', next_approver_email,
              'faculty_email', faculty_email
            ),
            NEW.id
          );
        END IF;

      WHEN 'pending_pro' THEN
        -- Keep this case for backward compatibility with existing bookings
        -- Principal approved - notify faculty and move to PRO (legacy workflow)
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
        
        -- Notify PRO for final approval (legacy workflow)
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

-- Step 2: Update RLS policies to remove PRO approval permissions
DROP POLICY IF EXISTS "Authorized users can update booking status" ON public.bookings;

CREATE POLICY "Authorized users can update booking status"
ON public.bookings
FOR UPDATE
USING (
  (
    status = 'pending_hod'::booking_status AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'hod'::user_role
        AND profiles.department = bookings.department
    )
  ) OR (
    status = 'pending_principal'::booking_status AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'principal'::user_role
    )
  )
  -- Removed PRO approval permissions - Principal is now final approver
)
WITH CHECK (
  -- Allow the same authorized approvers to write the new row regardless of new status
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND (
        profiles.role = 'hod'::user_role AND profiles.department = bookings.department
        OR profiles.role = 'principal'::user_role
        -- Removed PRO from WITH CHECK as well
      )
  )
);

-- Step 3: Update booking approvals RLS policy to remove PRO approval permissions
DROP POLICY IF EXISTS "Authorized users can insert approval records" ON public.booking_approvals;

CREATE POLICY "Authorized users can insert approval records" 
ON public.booking_approvals 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = approver_id 
        AND user_id = auth.uid()
        AND role IN ('hod', 'principal') -- Removed 'pro' from allowed roles
    )
);

-- Step 4: Add comment to document the workflow change
COMMENT ON FUNCTION public.handle_booking_status_change_unified() IS 
'Updated approval workflow: Faculty → HOD → Principal (Final approval). PRO no longer has approval permissions.';

-- Migration completed successfully
-- The new workflow is now: Faculty → HOD → Principal (Final approval)
-- PRO dashboard will only show confirmed bookings for offline preparation
