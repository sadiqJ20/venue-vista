-- Add hall status fields and update availability function

-- 1) Schema changes: halls status fields
ALTER TABLE public.halls
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_under_maintenance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status_note text,
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS status_updated_by uuid NULL REFERENCES public.profiles(id);

COMMENT ON COLUMN public.halls.is_blocked IS 'When true, hall cannot be booked';
COMMENT ON COLUMN public.halls.is_under_maintenance IS 'When true, hall cannot be booked and is marked as maintenance';

-- Ensure previous signatures are removed so we can change parameter types safely
DROP FUNCTION IF EXISTS public.get_available_halls(text, text, text);
DROP FUNCTION IF EXISTS public.get_available_halls(date, time without time zone, time without time zone);

-- 2) Update get_available_halls function to exclude blocked/maintenance halls
CREATE FUNCTION public.get_available_halls(
  booking_date date,
  end_time time,
  start_time time
) RETURNS TABLE (
  block public.block_name,
  capacity integer,
  has_ac boolean,
  has_audio_system boolean,
  has_mic boolean,
  has_projector boolean,
  id uuid,
  name text,
  type public.hall_type
) LANGUAGE sql STABLE AS $$
  SELECT h.block, h.capacity, h.has_ac, h.has_audio_system, h.has_mic, h.has_projector, h.id, h.name, h.type
  FROM public.halls h
  WHERE h.is_blocked = false
    AND h.is_under_maintenance = false
    AND NOT EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.hall_id = h.id
        AND b.event_date = booking_date
        AND b.status IN ('approved','pending_hod','pending_principal','pending_pro')
        AND (
          (start_time >= b.start_time::time AND start_time < b.end_time::time)
          OR (end_time > b.start_time::time AND end_time <= b.end_time::time)
          OR (start_time <= b.start_time::time AND end_time >= b.end_time::time)
        )
    )
  ORDER BY h.block, h.name;
$$;

-- 3) RLS: allow admin to update halls
DROP POLICY IF EXISTS "Admin can update all halls" ON public.halls;
CREATE POLICY "Admin can update all halls" ON public.halls
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- 4) Helpful index for status filters
CREATE INDEX IF NOT EXISTS idx_halls_status ON public.halls(is_blocked, is_under_maintenance);


