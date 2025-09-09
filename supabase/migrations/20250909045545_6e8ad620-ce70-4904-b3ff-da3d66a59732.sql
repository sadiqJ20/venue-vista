-- Fix database issues for hall booking system

-- First, ensure that triggers exist for the bookings table
-- Check if triggers are properly attached
DO $$
BEGIN
    -- Recreate trigger for booking availability check
    DROP TRIGGER IF EXISTS check_hall_availability_trigger ON public.bookings;
    CREATE TRIGGER check_hall_availability_trigger
        BEFORE INSERT OR UPDATE ON public.bookings
        FOR EACH ROW EXECUTE FUNCTION public.check_hall_availability();

    -- Recreate trigger for new booking notifications
    DROP TRIGGER IF EXISTS handle_new_booking_trigger ON public.bookings;
    CREATE TRIGGER handle_new_booking_trigger
        AFTER INSERT ON public.bookings
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_booking();

    -- Recreate trigger for booking status change notifications
    DROP TRIGGER IF EXISTS handle_booking_status_change_trigger ON public.bookings;
    CREATE TRIGGER handle_booking_status_change_trigger
        AFTER UPDATE ON public.bookings
        FOR EACH ROW EXECUTE FUNCTION public.handle_booking_status_change();

    -- Recreate trigger for updated_at timestamp
    DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
    CREATE TRIGGER update_bookings_updated_at
        BEFORE UPDATE ON public.bookings
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
        
    RAISE NOTICE 'All triggers have been recreated successfully';
END $$;