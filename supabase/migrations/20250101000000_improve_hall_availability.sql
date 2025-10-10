-- Improve hall availability checking with real-time considerations
-- This migration adds better time-based availability logic

-- Create a function to check if a hall is currently available (considering current time)
CREATE OR REPLACE FUNCTION public.is_hall_currently_available(
  hall_id_param uuid,
  event_date_param date,
  start_time_param time without time zone,
  end_time_param time without time zone,
  exclude_booking_id uuid DEFAULT NULL::uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- If the event is in the past, it's not available
  IF event_date_param < CURRENT_DATE THEN
    RETURN false;
  END IF;
  
  -- If the event is today and the start time has already passed, it's not available
  IF event_date_param = CURRENT_DATE AND start_time_param < CURRENT_TIME THEN
    RETURN false;
  END IF;
  
  -- Check for overlapping bookings
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
$function$;

-- Create a function to get hall availability status with more details
CREATE OR REPLACE FUNCTION public.get_hall_availability_status(
  hall_id_param uuid,
  event_date_param date,
  start_time_param time without time zone,
  end_time_param time without time zone,
  exclude_booking_id uuid DEFAULT NULL::uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  result jsonb;
  conflicting_booking record;
BEGIN
  -- Check if the requested time is in the past
  IF event_date_param < CURRENT_DATE OR 
     (event_date_param = CURRENT_DATE AND start_time_param < CURRENT_TIME) THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'Requested time is in the past',
      'conflicting_booking', null
    );
  END IF;
  
  -- Check for conflicting bookings
  SELECT * INTO conflicting_booking
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
  LIMIT 1;
  
  IF conflicting_booking IS NOT NULL THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'Hall is already booked for this time slot',
      'conflicting_booking', jsonb_build_object(
        'event_name', conflicting_booking.event_name,
        'faculty_name', conflicting_booking.faculty_name,
        'start_time', conflicting_booking.start_time,
        'end_time', conflicting_booking.end_time,
        'status', conflicting_booking.status
      )
    );
  END IF;
  
  RETURN jsonb_build_object(
    'available', true,
    'reason', 'Hall is available for the requested time slot',
    'conflicting_booking', null
  );
END;
$function$;

-- Update the existing is_hall_available function to be more explicit about time ranges
CREATE OR REPLACE FUNCTION public.is_hall_available(
  hall_id_param uuid,
  event_date_param date,
  start_time_param time without time zone,
  end_time_param time without time zone,
  exclude_booking_id uuid DEFAULT NULL::uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Validate time range
  IF start_time_param >= end_time_param THEN
    RETURN false;
  END IF;
  
  -- Check for overlapping bookings
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
$function$;
