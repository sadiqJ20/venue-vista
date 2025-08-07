-- Fix RLS policies for profiles table to allow registration
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create more permissive policies for registration
CREATE POLICY "Users can view profiles" ON public.profiles
FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name, mobile_number, role, department, unique_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', ''),
    COALESCE(new.raw_user_meta_data->>'mobile_number', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'faculty')::user_role,
    CASE 
      WHEN new.raw_user_meta_data->>'department' IS NOT NULL 
      THEN (new.raw_user_meta_data->>'department')::department 
      ELSE NULL 
    END,
    new.raw_user_meta_data->>'unique_id'
  );
  RETURN new;
END;
$$;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add real-time functionality for bookings
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- Add real-time functionality for booking_approvals
ALTER TABLE public.booking_approvals REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_approvals;