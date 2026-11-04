CREATE OR REPLACE FUNCTION public.trg_user_roles_sync_profile_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.fn_sync_profile_role_from_user_roles(OLD.user_id);
    RETURN OLD;
  END IF;
  PERFORM public.fn_sync_profile_role_from_user_roles(NEW.user_id);
  IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    PERFORM public.fn_sync_profile_role_from_user_roles(OLD.user_id);
  END IF;
  RETURN NEW;
END; $function$
