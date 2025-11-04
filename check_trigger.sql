-- Check if the trigger exists
SELECT 
    tgname as trigger_name,
    tgtype,
    tgenabled as enabled,
    tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname = 'enforce_single_admin';

-- Also check the function
SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc 
WHERE proname = 'check_single_admin';

