-- Migration to remove IIE CELL department

-- First, handle existing users with IIE CELL department
DO $$
BEGIN
    -- Check if there are any users with IIE CELL department
    IF EXISTS (SELECT 1 FROM public.profiles WHERE department = 'IIIE CELL'::department_name) THEN
        -- Update users to a default department (e.g., 'HR')
        UPDATE public.profiles 
        SET department = 'HR'::department_name 
        WHERE department = 'IIIE CELL'::department_name;
        
        RAISE NOTICE 'Updated % users from IIE CELL to HR', (SELECT COUNT(*) FROM public.profiles WHERE department = 'HR'::department_name);
    END IF;

    -- Handle bookings with IIE CELL department
    IF EXISTS (SELECT 1 FROM public.bookings WHERE department = 'IIIE CELL'::department_name) THEN
        -- Update bookings to a default department (e.g., 'HR')
        UPDATE public.bookings 
        SET department = 'HR'::department_name 
        WHERE department = 'IIIE CELL'::department_name;
        
        RAISE NOTICE 'Updated % bookings from IIE CELL to HR', (SELECT COUNT(*) FROM public.bookings WHERE department = 'HR'::department_name);
    END IF;
END $$;

-- Create a new enum type without IIE CELL
DO $$
BEGIN
    -- Create a new enum type with all values except IIE CELL
    CREATE TYPE department_name_new AS ENUM (
        'CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AERO', 'CHEMICAL', 'AIDS', 'CSBS', 
        'AI', 'ML', 'EI', 'BIO', 'NCC', 'NSS', 'III', 'IEDC', 'PRO',
        'TRAINING', 'PLACEMENT', 'SCIENCE & HUMANITIES', 'HR', 'INNOVATION', 'AI_ML'
    );
    
    -- Alter the tables to use the new type
    ALTER TABLE public.profiles 
        ALTER COLUMN department TYPE department_name_new 
        USING (department::text::department_name_new);
        
    ALTER TABLE public.bookings 
        ALTER COLUMN department TYPE department_name_new 
        USING (department::text::department_name_new);
    
    -- Drop the old type
    DROP TYPE department_name;
    
    -- Rename the new type to the original name
    ALTER TYPE department_name_new RENAME TO department_name;
    
    RAISE NOTICE 'Successfully removed IIE CELL from department_name enum';
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error removing IIE CELL department: %', SQLERRM;
END $$;

-- Update the department description
COMMENT ON TYPE department_name IS 'Academic and administrative departments';

-- Log the changes
DO $$
BEGIN
    RAISE NOTICE 'Successfully removed IIE CELL department';
END $$;
