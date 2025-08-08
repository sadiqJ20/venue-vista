-- Make handle_new_user robust to invalid enum values and align enum names
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  _role public.user_role := 'faculty';
  _department public.department_name := NULL;
BEGIN
  -- Safely map role if provided and valid
  IF (new.raw_user_meta_data ? 'role') THEN
    IF (EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumtypid = 'public.user_role'::regtype 
        AND enumlabel = new.raw_user_meta_data->>'role'
    )) THEN
      _role := (new.raw_user_meta_data->>'role')::public.user_role;
    END IF;
  END IF;

  -- Safely map department if provided and valid
  IF (new.raw_user_meta_data ? 'department') THEN
    IF (EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumtypid = 'public.department_name'::regtype 
        AND enumlabel = new.raw_user_meta_data->>'department'
    )) THEN
      _department := (new.raw_user_meta_data->>'department')::public.department_name;
    END IF;
  END IF;

  INSERT INTO public.profiles (user_id, email, name, mobile_number, role, department, unique_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', ''),
    COALESCE(new.raw_user_meta_data->>'mobile_number', ''),
    _role,
    _department,
    new.raw_user_meta_data->>'unique_id'
  );

  RETURN new;
END;
$$;