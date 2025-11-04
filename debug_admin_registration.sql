-- Debug Admin Registration Issues
-- Run this to check what might be blocking registration

-- 1. Check if admin already exists
SELECT 'Existing admins:' as check_type, COUNT(*) as count
FROM profiles WHERE role = 'admin';

-- 2. Check trigger function
SELECT 'Trigger function:' as check_type, proname, prosrc
FROM pg_proc 
WHERE proname = 'check_single_admin';

-- 3. Check trigger
SELECT 'Trigger:' as check_type, tgname, tgenabled, tgrelid::regclass
FROM pg_trigger 
WHERE tgname = 'enforce_single_admin';

-- 4. Check handle_new_user function
SELECT 'handle_new_user function:' as check_type, proname
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 5. Check INSERT policies on profiles
SELECT 'INSERT Policies:' as check_type, policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles' AND cmd = 'INSERT';

-- 6. Check if admin role exists in enum
SELECT 'Admin in enum:' as check_type, 
       CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as exists
FROM pg_enum 
WHERE enumtypid = 'user_role'::regtype 
  AND enumlabel = 'admin';

