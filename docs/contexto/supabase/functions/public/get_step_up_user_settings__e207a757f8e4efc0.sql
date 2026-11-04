CREATE OR REPLACE FUNCTION public.get_step_up_user_settings(_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$ SELECT public.step_up_user_settings_get(_user_id); $function$
