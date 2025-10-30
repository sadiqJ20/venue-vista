-- Add new departments to the department_name enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'department_name') THEN
        CREATE TYPE department_name AS ENUM (
            'CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AERO', 'CHEMICAL', 'AIDS', 'CSBS', 'AI', 'ML', 'EI', 'BIO',
            'NCC', 'NSS', 'III', 'IEDC', 'PRO'
        );
    ELSE
        -- Add new enum values if they don't exist
        ALTER TYPE department_name ADD VALUE IF NOT EXISTS 'NCC';
        ALTER TYPE department_name ADD VALUE IF NOT EXISTS 'NSS';
        ALTER TYPE department_name ADD VALUE IF NOT EXISTS 'III';
        ALTER TYPE department_name ADD VALUE IF NOT EXISTS 'IEDC';
        ALTER TYPE department_name ADD VALUE IF NOT EXISTS 'PRO';
    END IF;
END $$;

-- Update department descriptions in the comments
COMMENT ON TYPE department_name IS 'Academic and administrative departments including NCC, NSS, III, IEDC, and PRO';

-- Log the changes
DO $$
BEGIN
    RAISE NOTICE 'Successfully added new departments: NCC, NSS, III, IEDC, PRO';
END $$;
