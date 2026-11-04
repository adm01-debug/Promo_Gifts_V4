CREATE OR REPLACE FUNCTION public.enable_step_up_for_user(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_supervisor_or_above(auth.uid()) THEN RAISE EXCEPTION 'Permission denied'; END IF;
  PERFORM public.step_up_user_settings_set('{"enabled": true}'::jsonb, _user_id);
END $function$
