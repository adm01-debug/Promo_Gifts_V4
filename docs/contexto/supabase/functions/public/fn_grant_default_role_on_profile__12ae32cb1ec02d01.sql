CREATE OR REPLACE FUNCTION public.fn_grant_default_role_on_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    INSERT INTO public.user_roles (user_id, role, granted_by)
    VALUES (
      NEW.id,
      CASE 
        WHEN NEW.role = 'admin'             THEN 'admin'::public.app_role
        WHEN NEW.role = 'manager'           THEN 'coordenador'::public.app_role
        WHEN NEW.role IN ('sales','seller') THEN 'vendedor'::public.app_role
        WHEN NEW.role = 'dev'               THEN 'dev'::public.app_role
        ELSE 'vendedor'::public.app_role
      END,
      NEW.id  -- self-granted; trigger only fires on first INSERT
    );
  END IF;
  RETURN NEW;
END;
$function$
