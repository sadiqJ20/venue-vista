-- Fixed Admin Migration - Handles existing policies
-- Run this in Supabase SQL Editor
-- This will work even if some policies already exist

-- Step 1: Add 'admin' to enum (safe - won't duplicate)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';

-- Step 2: Create or replace the function (safe - will update if exists)
CREATE OR REPLACE FUNCTION public.check_single_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If trying to insert/update a profile with admin role, check if admin already exists
  IF NEW.role = 'admin' THEN
    -- Check if there's already an admin (excluding the current row if updating)
    IF EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE role = 'admin' 
      AND (TG_OP = 'INSERT' OR id != NEW.id)
    ) THEN
      RAISE EXCEPTION 'Only one Admin account is allowed.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 3: Create trigger (safe - drops existing if present)
DROP TRIGGER IF EXISTS enforce_single_admin ON public.profiles;
CREATE TRIGGER enforce_single_admin
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_single_admin();

-- Step 4: Drop existing policies if they exist, then recreate them
-- This ensures consistency

DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
CREATE POLICY "Admin can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
    OR auth.uid() = user_id
);

DROP POLICY IF EXISTS "Admin can delete profiles" ON public.profiles;
CREATE POLICY "Admin can delete profiles" 
ON public.profiles 
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
    AND user_id != auth.uid()
);

DROP POLICY IF EXISTS "Admin can view all bookings" ON public.bookings;
CREATE POLICY "Admin can view all bookings" 
ON public.bookings 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

DROP POLICY IF EXISTS "Admin can view all booking approvals" ON public.booking_approvals;
CREATE POLICY "Admin can view all booking approvals" 
ON public.booking_approvals 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Verification - run this to confirm everything is set up
SELECT 
    '✓ Migration Complete!' as status,
    (SELECT COUNT(*) FROM pg_enum WHERE enumtypid = 'user_role'::regtype AND enumlabel = 'admin') as admin_role_exists,
    (SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'enforce_single_admin') as trigger_exists,
    (SELECT COUNT(*) FROM pg_proc WHERE proname = 'check_single_admin') as function_exists,
    (SELECT COUNT(*) FROM pg_policies WHERE policyname LIKE '%Admin%' AND tablename = 'profiles') as profile_policies_count,
    (SELECT COUNT(*) FROM pg_policies WHERE policyname LIKE '%Admin%' AND tablename = 'bookings') as booking_policies_count;

