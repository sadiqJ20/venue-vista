-- Fix Infinite Recursion in Admin Policies
-- Run this in Supabase SQL Editor
-- This fixes the recursion issue by using a security definer function

-- Step 1: Create a function to check if current user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
END;
$$;

-- Step 2: Drop the problematic policies
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can delete profiles" ON public.profiles;

-- Step 3: Recreate policies using the function (no recursion!)
CREATE POLICY "Admin can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
    public.is_admin_user()
    OR auth.uid() = user_id
);

CREATE POLICY "Admin can delete profiles" 
ON public.profiles 
FOR DELETE
USING (
    public.is_admin_user()
    AND user_id != auth.uid()
);

-- Step 4: Also fix booking policies if they have similar issues
DROP POLICY IF EXISTS "Admin can view all bookings" ON public.bookings;
CREATE POLICY "Admin can view all bookings" 
ON public.bookings 
FOR SELECT 
USING (
    public.is_admin_user()
);

DROP POLICY IF EXISTS "Admin can view all booking approvals" ON public.booking_approvals;
CREATE POLICY "Admin can view all booking approvals" 
ON public.booking_approvals 
FOR SELECT 
USING (
    public.is_admin_user()
);

-- Verification
SELECT 
    '✓ Policies Fixed!' as status,
    (SELECT COUNT(*) FROM pg_proc WHERE proname = 'is_admin_user') as function_exists,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles' AND policyname LIKE '%Admin%') as profile_policies;

