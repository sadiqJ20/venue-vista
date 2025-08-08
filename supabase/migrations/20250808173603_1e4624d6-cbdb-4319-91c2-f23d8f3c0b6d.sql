-- 1) Add new columns to bookings for description and faculty phone
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS faculty_phone text;

-- 2) Fix RLS UPDATE policy to allow approvers to change status without failing WITH CHECK
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
  ) OR (
    status = 'pending_pro'::booking_status AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'pro'::user_role
    )
  )
)
WITH CHECK (
  -- Allow the same authorized approvers to write the new row regardless of new status
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND (
        profiles.role = 'hod'::user_role AND profiles.department = bookings.department
        OR profiles.role = 'principal'::user_role
        OR profiles.role = 'pro'::user_role
      )
  )
);
