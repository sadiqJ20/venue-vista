-- Create enum types for better data integrity
CREATE TYPE public.user_role AS ENUM ('faculty', 'hod', 'principal', 'pro');
CREATE TYPE public.department_name AS ENUM ('CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AERO', 'CHEMICAL', 'AIDS', 'CSBS');
CREATE TYPE public.block_name AS ENUM ('East Block', 'West Block', 'Main Block', 'Diploma Block');
CREATE TYPE public.hall_type AS ENUM ('Auditorium', 'Smart Classroom');
CREATE TYPE public.booking_status AS ENUM ('pending_hod', 'pending_principal', 'pending_pro', 'approved', 'rejected');
CREATE TYPE public.institution_type AS ENUM ('School', 'Diploma', 'Polytechnic', 'Engineering');

-- Create profiles table for user management
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    role user_role NOT NULL,
    department department_name,
    unique_id TEXT,
    password_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create halls table
CREATE TABLE public.halls (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    block block_name NOT NULL,
    type hall_type NOT NULL,
    capacity INTEGER NOT NULL,
    has_ac BOOLEAN DEFAULT false,
    has_mic BOOLEAN DEFAULT false,
    has_projector BOOLEAN DEFAULT false,
    has_audio_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bookings table
CREATE TABLE public.bookings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    hall_id UUID NOT NULL REFERENCES public.halls(id) ON DELETE CASCADE,
    faculty_name TEXT NOT NULL,
    organizer_name TEXT NOT NULL,
    institution_type institution_type NOT NULL,
    guest_lectures_count INTEGER NOT NULL,
    guest_lecture_names TEXT,
    event_name TEXT NOT NULL,
    department department_name NOT NULL,
    hod_name TEXT NOT NULL,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    attendees_count INTEGER NOT NULL,
    student_years TEXT[], -- Array of selected years
    required_ac BOOLEAN DEFAULT false,
    required_mic BOOLEAN DEFAULT false,
    required_projector BOOLEAN DEFAULT false,
    required_audio_system BOOLEAN DEFAULT false,
    status booking_status NOT NULL DEFAULT 'pending_hod',
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create booking approvals table to track approval workflow
CREATE TABLE public.booking_approvals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('approved', 'rejected')),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for halls (viewable by all authenticated users)
CREATE POLICY "Authenticated users can view halls" 
ON public.halls 
FOR SELECT 
TO authenticated 
USING (true);

-- RLS Policies for bookings
CREATE POLICY "Faculty can view their own bookings" 
ON public.bookings 
FOR SELECT 
USING (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = faculty_id)
);

CREATE POLICY "HODs can view bookings from their department" 
ON public.bookings 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role = 'hod' 
        AND department = bookings.department
    )
);

CREATE POLICY "Principal can view all bookings" 
ON public.bookings 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role = 'principal'
    )
);

CREATE POLICY "PRO can view approved bookings" 
ON public.bookings 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role = 'pro'
    )
);

CREATE POLICY "Faculty can insert bookings" 
ON public.bookings 
FOR INSERT 
WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = faculty_id)
);

CREATE POLICY "Authorized users can update booking status" 
ON public.bookings 
FOR UPDATE 
USING (
    -- HOD can update bookings from their department
    (status = 'pending_hod' AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role = 'hod' 
        AND department = bookings.department
    ))
    OR
    -- Principal can update bookings that are pending_principal
    (status = 'pending_principal' AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role = 'principal'
    ))
    OR
    -- PRO can update bookings that are pending_pro
    (status = 'pending_pro' AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() 
        AND role = 'pro'
    ))
);

-- RLS Policies for booking approvals
CREATE POLICY "Users can view approvals for their bookings or approvals they made" 
ON public.booking_approvals 
FOR SELECT 
USING (
    -- Faculty can see approvals for their bookings
    EXISTS (
        SELECT 1 FROM public.bookings b
        JOIN public.profiles p ON b.faculty_id = p.id
        WHERE b.id = booking_approvals.booking_id 
        AND p.user_id = auth.uid()
    )
    OR
    -- Approvers can see their own approvals
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = approver_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Authorized users can insert approval records" 
ON public.booking_approvals 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = approver_id 
        AND user_id = auth.uid()
        AND role IN ('hod', 'principal', 'pro')
    )
);

-- Insert halls data
INSERT INTO public.halls (name, block, type, capacity, has_ac, has_mic, has_projector, has_audio_system) VALUES
-- East Block
('East Auditorium', 'East Block', 'Auditorium', 300, true, true, true, true),
('East Smart Classroom 1', 'East Block', 'Smart Classroom', 80, true, true, true, false),
('East Smart Classroom 2', 'East Block', 'Smart Classroom', 80, true, true, true, false),
-- West Block
('West Auditorium', 'West Block', 'Auditorium', 350, true, true, true, true),
('West Smart Classroom 1', 'West Block', 'Smart Classroom', 75, true, true, true, false),
('West Smart Classroom 2', 'West Block', 'Smart Classroom', 75, true, true, true, false),
-- Main Block
('Main Auditorium', 'Main Block', 'Auditorium', 500, true, true, true, true),
('Main Smart Classroom 1', 'Main Block', 'Smart Classroom', 100, true, true, true, true),
('Main Smart Classroom 2', 'Main Block', 'Smart Classroom', 100, true, true, true, true),
-- Diploma Block
('Diploma Auditorium', 'Diploma Block', 'Auditorium', 200, true, true, true, true),
('Diploma Smart Classroom 1', 'Diploma Block', 'Smart Classroom', 60, true, true, true, false),
('Diploma Smart Classroom 2', 'Diploma Block', 'Smart Classroom', 60, true, true, true, false);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_halls_updated_at
    BEFORE UPDATE ON public.halls
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to prevent double booking
CREATE OR REPLACE FUNCTION public.check_hall_availability()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if hall is already booked for the same date and overlapping time
    IF EXISTS (
        SELECT 1 FROM public.bookings 
        WHERE hall_id = NEW.hall_id 
        AND event_date = NEW.event_date
        AND status != 'rejected'
        AND (
            (NEW.start_time >= start_time AND NEW.start_time < end_time) OR
            (NEW.end_time > start_time AND NEW.end_time <= end_time) OR
            (NEW.start_time <= start_time AND NEW.end_time >= end_time)
        )
        AND (TG_OP = 'INSERT' OR id != NEW.id)
    ) THEN
        RAISE EXCEPTION 'Hall is already booked for the selected date and time';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent double booking
CREATE TRIGGER check_hall_availability_trigger
    BEFORE INSERT OR UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.check_hall_availability();