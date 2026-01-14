-- Add telefone column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telefone text;

-- Create index for telefone
CREATE INDEX IF NOT EXISTS idx_profiles_telefone ON public.profiles(telefone);

-- Update the handle_new_user function to include telefone
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invite_role app_role;
  user_name text;
  user_telefone text;
  invite_id uuid;
BEGIN
  -- Get user name and telefone from metadata
  user_name := COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1));
  user_telefone := NEW.raw_user_meta_data->>'telefone';
  
  -- Create profile with telefone
  INSERT INTO public.profiles (id, nome, email, telefone, status)
  VALUES (NEW.id, user_name, NEW.email, user_telefone, 'ativo');
  
  -- Try to get role from invite and mark it as used
  SELECT id, role INTO invite_id, invite_role
  FROM public.invites
  WHERE LOWER(email) = LOWER(NEW.email)
    AND used_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Mark invite as used if found
  IF invite_id IS NOT NULL THEN
    UPDATE public.invites 
    SET used_at = now() 
    WHERE id = invite_id;
  END IF;
  
  -- If no invite found, check metadata (backup)
  IF invite_role IS NULL THEN
    invite_role := COALESCE(
      (NEW.raw_user_meta_data->>'invite_role')::app_role,
      'user'::app_role
    );
  END IF;
  
  -- Create user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, invite_role);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    -- Ensure at least basic profile and role exist
    INSERT INTO public.profiles (id, nome, email, telefone, status)
    VALUES (NEW.id, user_name, NEW.email, user_telefone, 'ativo')
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::app_role)
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$function$;