-- Add notifications table for enhanced notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policy for system to insert notifications
CREATE POLICY "System can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Add hall assignment change tracking to bookings
ALTER TABLE public.bookings ADD COLUMN original_hall_id UUID;
ALTER TABLE public.bookings ADD COLUMN hall_changed_by UUID;
ALTER TABLE public.bookings ADD COLUMN hall_change_reason TEXT;

-- Create function to check hall availability
CREATE OR REPLACE FUNCTION public.is_hall_available(
  hall_id_param UUID,
  event_date_param DATE,
  start_time_param TIME,
  end_time_param TIME,
  exclude_booking_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 
    FROM public.bookings 
    WHERE hall_id = hall_id_param 
    AND event_date = event_date_param
    AND status IN ('approved', 'pending_hod', 'pending_principal', 'pending_pro')
    AND (
      (start_time_param >= start_time AND start_time_param < end_time) OR
      (end_time_param > start_time AND end_time_param <= end_time) OR
      (start_time_param <= start_time AND end_time_param >= end_time)
    )
    AND (exclude_booking_id IS NULL OR id != exclude_booking_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to send notifications
CREATE OR REPLACE FUNCTION public.send_notification(
  user_id_param UUID,
  title_param TEXT,
  message_param TEXT,
  type_param TEXT,
  data_param JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, data)
  VALUES (user_id_param, title_param, message_param, type_param, data_param)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function for booking status notifications
CREATE OR REPLACE FUNCTION public.handle_booking_status_change()
RETURNS trigger AS $$
DECLARE
  faculty_user_id UUID;
  approver_user_id UUID;
  approver_role TEXT;
  hall_name TEXT;
  decision_text TEXT;
  rejection_reason_text TEXT;
BEGIN
  -- Get faculty user_id
  SELECT user_id INTO faculty_user_id 
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
        SELECT user_id, 'HOD' INTO approver_user_id, approver_role
        FROM profiles 
        WHERE role = 'hod' AND department = NEW.department;
      WHEN 'pending_pro' THEN
        decision_text := 'approved by Principal';
        SELECT user_id, 'Principal' INTO approver_user_id, approver_role
        FROM profiles 
        WHERE role = 'principal';
      WHEN 'approved' THEN
        decision_text := 'approved by PRO';
        SELECT user_id, 'PRO' INTO approver_user_id, approver_role
        FROM profiles 
        WHERE role = 'pro';
      WHEN 'rejected' THEN
        decision_text := 'rejected';
        rejection_reason_text := COALESCE(NEW.rejection_reason, 'No reason provided');
        -- Determine who rejected based on previous status
        CASE OLD.status
          WHEN 'pending_hod' THEN
            SELECT user_id, 'HOD' INTO approver_user_id, approver_role
            FROM profiles 
            WHERE role = 'hod' AND department = NEW.department;
          WHEN 'pending_principal' THEN
            SELECT user_id, 'Principal' INTO approver_user_id, approver_role
            FROM profiles 
            WHERE role = 'principal';
          WHEN 'pending_pro' THEN
            SELECT user_id, 'PRO' INTO approver_user_id, approver_role
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
            'rejection_reason', rejection_reason_text
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
            'status', NEW.status
          )
        );
      END IF;
    END IF;

    -- Send notifications to next approver in workflow
    IF NEW.status = 'pending_principal' THEN
      -- Notify Principal
      SELECT user_id INTO approver_user_id 
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
            'event_name', NEW.event_name
          )
        );
      END IF;
    ELSIF NEW.status = 'pending_pro' THEN
      -- Notify PRO
      SELECT user_id INTO approver_user_id 
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
            'event_name', NEW.event_name
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
    BEGIN
      SELECT name INTO old_hall_name FROM halls WHERE id = OLD.hall_id;
      SELECT name INTO new_hall_name FROM halls WHERE id = NEW.hall_id;
      SELECT name INTO changer_name FROM profiles WHERE id = NEW.hall_changed_by;
      
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
          'event_date', NEW.event_date
        )
      );
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for booking notifications
CREATE TRIGGER booking_status_change_trigger
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION handle_booking_status_change();

-- Create trigger for new booking notifications to HOD
CREATE OR REPLACE FUNCTION public.handle_new_booking()
RETURNS trigger AS $$
DECLARE
  hod_user_id UUID;
  hall_name TEXT;
BEGIN
  -- Get HOD user_id for this department
  SELECT user_id INTO hod_user_id 
  FROM profiles 
  WHERE role = 'hod' AND department = NEW.department;

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
        'department', NEW.department
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new bookings
CREATE TRIGGER new_booking_notification_trigger
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION handle_new_booking();