-- Fix remaining function search path warnings
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_hall_availability()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    -- Check if hall is already booked for the same date and overlapping time
    IF EXISTS (
        SELECT 1 FROM public.bookings 
        WHERE hall_id = NEW.hall_id 
        AND event_date = NEW.event_date
        AND status != 'rejected'
        AND (
            (NEW.start_time >= start_time AND NEW.start_time < end_time) OR
            (NEW.end_time > start_time AND NEW.end_time <= end_time) OR
            (NEW.start_time <= start_time AND NEW.end_time >= end_time)
        )
        AND (TG_OP = 'INSERT' OR id != NEW.id)
    ) THEN
        RAISE EXCEPTION 'Hall is already booked for the selected date and time';
    END IF;
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_hall_available(hall_id_param uuid, event_date_param date, start_time_param time without time zone, end_time_param time without time zone, exclude_booking_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;