CREATE OR REPLACE FUNCTION public.update_step_up_user_settings(_settings jsonb, _user_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$ SELECT public.step_up_user_settings_set(_settings, _user_id); $function$
