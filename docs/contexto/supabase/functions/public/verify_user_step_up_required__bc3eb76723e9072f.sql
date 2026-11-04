CREATE OR REPLACE FUNCTION public.verify_user_step_up_required(_action step_up_action, _user_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$ SELECT NOT public.user_can_skip_step_up(_user_id); $function$
