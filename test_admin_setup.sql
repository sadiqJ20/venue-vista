-- Complete Admin Setup Verification
-- Run this to verify everything is working

-- 1. Verify 'admin' role exists
SELECT '✓ Admin role exists' as status, 
       COUNT(*) as count 
FROM pg_enum 
WHERE enumtypid = 'user_role'::regtype 
  AND enumlabel = 'admin';

-- 2. Check trigger
SELECT '✓ Trigger exists' as status,
       tgname as trigger_name
FROM pg_trigger 
WHERE tgname = 'enforce_single_admin';

-- 3. Check function
SELECT '✓ Function exists' as status,
       proname as function_name
FROM pg_proc 
WHERE proname = 'check_single_admin';

-- 4. Count existing admins (should be 0 or 1)
SELECT 'Current admin count' as status,
       COUNT(*) as admin_count
FROM profiles 
WHERE role = 'admin';

-- 5. List all admin policies
SELECT 'Admin policies' as status,
       policyname,
       tablename
FROM pg_policies 
WHERE policyname LIKE '%Admin%' OR policyname LIKE '%admin%'
ORDER BY tablename, policyname;

