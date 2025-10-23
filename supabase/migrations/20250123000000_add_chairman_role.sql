-- Add 'chairman' to the user_role enum type
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'chairman';

-- Add RLS policy for Chairman to view all bookings (similar to Principal and PRO)
CREATE POLICY "Chairman can view all bookings" 
ON public.bookings 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role = 'chairman'
    )
);

-- Grant Chairman the ability to view all booking approvals
CREATE POLICY "Chairman can view all booking approvals" 
ON public.booking_approvals 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role = 'chairman'
    )
);
