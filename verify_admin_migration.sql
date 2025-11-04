-- Verify Admin Migration
-- Run these queries in Supabase SQL Editor to verify everything is set up correctly

-- 1. Check if 'admin' role exists in enum
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;

-- 2. Check if the trigger function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'check_single_admin';

-- 3. Check if the trigger exists
SELECT tgname, tgtype, tgenabled 
FROM pg_trigger 
WHERE tgname = 'enforce_single_admin';

-- 4. Check RLS policies for admin
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE policyname LIKE '%Admin%' OR policyname LIKE '%admin%';

-- 5. Try to see if admin constraint works (should return 0 if no admin exists yet)
SELECT COUNT(*) as admin_count 
FROM profiles 
WHERE role = 'admin';

