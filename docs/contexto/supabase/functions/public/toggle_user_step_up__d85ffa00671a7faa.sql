CREATE OR REPLACE FUNCTION public.toggle_user_step_up(_user_id uuid, _enabled boolean)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_supervisor_or_above(auth.uid()) THEN RAISE EXCEPTION 'Permission denied'; END IF;
  PERFORM public.step_up_user_settings_set(jsonb_build_object('enabled', _enabled), _user_id);
END $function$
