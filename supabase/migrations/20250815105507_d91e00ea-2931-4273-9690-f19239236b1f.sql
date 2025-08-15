-- Create email_logs table for tracking email notifications
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failure')),
  error_message TEXT,
  booking_id UUID,
  notification_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for email_logs
CREATE POLICY "System can insert email logs" 
ON public.email_logs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view email logs" 
ON public.email_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('principal', 'pro')
));

-- Create indexes for better performance
CREATE INDEX idx_email_logs_booking_id ON public.email_logs(booking_id);
CREATE INDEX idx_email_logs_sent_at ON public.email_logs(sent_at);
CREATE INDEX idx_email_logs_status ON public.email_logs(status);

-- Update the handle_booking_status_change function to also send emails
CREATE OR REPLACE FUNCTION public.handle_booking_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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
            'approver_email', approver_email
          )
        );
      ELSE
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
            'approver_email', approver_email
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
            'faculty_email', faculty_email
          )
        );
      END IF;
    ELSIF NEW.status = 'pending_pro' THEN
      -- Notify PRO
      SELECT user_id, email INTO approver_user_id, approver_email
      FROM profiles 
      WHERE role = 'pro';
      
      IF approver_user_id IS NOT NULL THEN
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
          'changer_email', changer_email
        )
      );
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- Update the handle_new_booking function to also send emails
CREATE OR REPLACE FUNCTION public.handle_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  hod_user_id UUID;
  hod_email TEXT;
  faculty_email TEXT;
  hall_name TEXT;
BEGIN
  -- Get HOD user_id and email for this department
  SELECT user_id, email INTO hod_user_id, hod_email
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
    PERFORM send_notification(
      hod_user_id,
      'New Booking Request',
      format('New booking request from %s for %s on %s requires your approval',
        NEW.faculty_name, hall_name, NEW.event_date),
      'approval_required',
      jsonb_build_object(
        'booking_id', NEW.id,
        'hall_name', hall_name,
        'event_date', NEW.event_date,
        'faculty_name', NEW.faculty_name,
        'event_name', NEW.event_name,
        'department', NEW.department,
        'recipient_email', hod_email,
        'faculty_email', faculty_email
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;