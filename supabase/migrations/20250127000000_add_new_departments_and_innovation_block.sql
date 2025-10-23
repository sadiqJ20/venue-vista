-- Add new departments to the department_name enum
-- Note: PostgreSQL doesn't support adding multiple enum values in one ALTER TYPE statement
-- We need to add them one by one

-- Add new departments
ALTER TYPE public.department_name ADD VALUE 'MCA';
ALTER TYPE public.department_name ADD VALUE 'MBA';
ALTER TYPE public.department_name ADD VALUE 'TRAINING';
ALTER TYPE public.department_name ADD VALUE 'PLACEMENT';
ALTER TYPE public.department_name ADD VALUE 'SCIENCE & HUMANITIES';
ALTER TYPE public.department_name ADD VALUE 'IIIE CELL';
ALTER TYPE public.department_name ADD VALUE 'HR';
ALTER TYPE public.department_name ADD VALUE 'INNOVATION';
ALTER TYPE public.department_name ADD VALUE 'AI_ML';

-- Add Innovation Block to the block_name enum
ALTER TYPE public.block_name ADD VALUE 'Innovation Block';

-- Insert new halls for Innovation Block
INSERT INTO public.halls (name, block, type, capacity, has_ac, has_mic, has_projector, has_audio_system)
VALUES 
('Innovation Smart Classroom 1', 'Innovation Block', 'Smart Classroom', 70, true, true, true, false),
('Innovation Smart Classroom 2', 'Innovation Block', 'Smart Classroom', 70, true, true, true, false);
