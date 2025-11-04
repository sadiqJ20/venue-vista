-- Fix Admin Registration Error
-- Run this in Supabase SQL Editor
-- This fixes the "Database error saving new user" issue

-- Step 1: Update check_single_admin trigger to handle the trigger context better
CREATE OR REPLACE FUNCTION public.check_single_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_admin_count INTEGER;
BEGIN
  -- Only check if trying to set role to admin
  IF NEW.role = 'admin' THEN
    -- Count existing admins (excluding current row if updating)
    SELECT COUNT(*) INTO existing_admin_count
    FROM public.profiles 
    WHERE role = 'admin' 
    AND (TG_OP = 'INSERT' OR id != NEW.id);
    
    -- If admin already exists, raise error
    IF existing_admin_count > 0 THEN
      RAISE EXCEPTION 'Only one Admin account is allowed.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 2: Ensure handle_new_user function can handle admin role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.user_role := 'faculty';
  _department public.department_name := NULL;
BEGIN
  -- Safely map role if provided and valid
  IF (new.raw_user_meta_data ? 'role') THEN
    IF (EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumtypid = 'public.user_role'::regtype 
        AND enumlabel = new.raw_user_meta_data->>'role'
    )) THEN
      _role := (new.raw_user_meta_data->>'role')::public.user_role;
    END IF;
  END IF;

  -- Safely map department if provided and valid (admin doesn't need department)
  IF (new.raw_user_meta_data ? 'department') AND new.raw_user_meta_data->>'department' IS NOT NULL AND new.raw_user_meta_data->>'department' != '' THEN
    IF (EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumtypid = 'public.department_name'::regtype 
        AND enumlabel = new.raw_user_meta_data->>'department'
    )) THEN
      _department := (new.raw_user_meta_data->>'department')::public.department_name;
    END IF;
  END IF;

  -- Insert profile (trigger will check for single admin)
  INSERT INTO public.profiles (user_id, email, name, mobile_number, role, department, unique_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', ''),
    COALESCE(new.raw_user_meta_data->>'mobile_number', ''),
    _role,
    _department,
    new.raw_user_meta_data->>'unique_id'
  );

  RETURN new;
END;
$$;

-- Step 3: Ensure INSERT policy allows profile creation
-- Drop and recreate to ensure it's correct
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Step 4: Also ensure the trigger function can bypass RLS when checking
-- The check_single_admin function already uses SECURITY DEFINER, so it should work
-- But let's make sure the trigger is properly set up
DROP TRIGGER IF EXISTS enforce_single_admin ON public.profiles;
CREATE TRIGGER enforce_single_admin
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_single_admin();

-- Step 5: Verify everything
SELECT 
    '✓ Fix Applied!' as status,
    (SELECT COUNT(*) FROM pg_proc WHERE proname = 'check_single_admin') as trigger_function_exists,
    (SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'enforce_single_admin') as trigger_exists,
    (SELECT COUNT(*) FROM pg_proc WHERE proname = 'handle_new_user') as handle_new_user_exists,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles' AND cmd = 'INSERT') as insert_policies;

