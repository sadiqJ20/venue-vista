-- Add database-level validation for attendees_count against hall capacity
-- This ensures backend validation matches frontend validation

-- Create a function to validate attendees count against hall capacity
CREATE OR REPLACE FUNCTION validate_attendees_capacity()
RETURNS TRIGGER AS $$
DECLARE
  hall_max_capacity INTEGER;
BEGIN
  -- Get the capacity of the selected hall
  SELECT capacity INTO hall_max_capacity
  FROM public.halls
  WHERE id = NEW.hall_id;
  
  -- Check if attendees_count exceeds hall capacity
  IF NEW.attendees_count > hall_max_capacity THEN
    RAISE EXCEPTION 'Attendees count (%) exceeds hall capacity (%)', NEW.attendees_count, hall_max_capacity;
  END IF;
  
  -- Check if attendees_count is at least 1
  IF NEW.attendees_count < 1 THEN
    RAISE EXCEPTION 'Attendees count must be at least 1';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce validation on INSERT
CREATE TRIGGER check_attendees_capacity_insert
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_attendees_capacity();

-- Create trigger to enforce validation on UPDATE
CREATE TRIGGER check_attendees_capacity_update
  BEFORE UPDATE OF attendees_count, hall_id ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_attendees_capacity();

-- Add a comment to document the constraint
COMMENT ON FUNCTION validate_attendees_capacity() IS 
  'Validates that attendees_count is between 1 and the selected hall capacity. 
   This ensures bookings cannot exceed physical hall limits.';
