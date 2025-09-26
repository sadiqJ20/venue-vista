-- Fix the handle_new_booking function that has a syntax error causing "schema new does not exist"
CREATE OR REPLACE FUNCTION public.handle_new_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$DECLARE
  hod_user_id UUID;
  hod_email TEXT;
  faculty_email TEXT;
  hall_name TEXT;
  email_subject TEXT;
  email_body TEXT;
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
    email_subject := format('New Hall Booking Request - %s', hall_name);
    email_body := format('A new hall booking request requires your approval.\n\nBooking Details:\n- Requester: %s\n- Hall: %s\n- Date: %s\n- Time: %s to %s\n- Event: %s\n- Department: %s\n- Attendees: %s\n\nPlease review and approve/reject this booking request.',
      NEW.faculty_name,
      hall_name,
      TO_CHAR(NEW.event_date, 'DD/MM/YYYY'),
      NEW.start_time,
      NEW.end_time,
      NEW.event_name,
      NEW.department,
      NEW.attendees_count
    );
    
    PERFORM send_notification(
      hod_user_id,
      'New Booking Request',
      format('New booking request from %s for %s on %s requires your approval',
        NEW.faculty_name, hall_name, NEW.event_date),
      'approval_required',
      jsonb_build_object(
        'booking_id', NEW.id,
        'hall_name', hall_name,
        'event_date', TO_CHAR(NEW.event_date, 'YYYY-MM-DD'),
        'faculty_name', NEW.faculty_name,
        'event_name', NEW.event_name,
        'department', NEW.department,
        'recipient_email', hod_email,
        'faculty_email', faculty_email,
        'email_subject', email_subject,
        'email_body', email_body
      )
    );
  END IF;

  RETURN NEW;
END;$function$