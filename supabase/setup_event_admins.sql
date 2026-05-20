ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS managed_event TEXT;

CREATE OR REPLACE FUNCTION assign_event_admin(target_email TEXT, target_event TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Find the user by email
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', target_email;
  END IF;
  
  -- Grant admin role so they pass RLS
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Record the specific event in their profile
  UPDATE public.profiles SET managed_event = target_event WHERE user_id = target_user_id;
END;
$$;
