-- Remove student_years column completely from bookings table
ALTER TABLE public.bookings DROP COLUMN IF EXISTS student_years;