-- Add 'admin' to the user_role enum type
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';

-- Create a function to check if admin already exists before allowing new admin registration
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

-- Create trigger to enforce single admin constraint
DROP TRIGGER IF EXISTS enforce_single_admin ON public.profiles;
CREATE TRIGGER enforce_single_admin
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_single_admin();

-- Add RLS policy for Admin to view all profiles
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

-- Add RLS policy for Admin to delete any profile (except themselves)
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

-- Add RLS policy for Admin to view all bookings
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

-- Add RLS policy for Admin to view all booking approvals
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

