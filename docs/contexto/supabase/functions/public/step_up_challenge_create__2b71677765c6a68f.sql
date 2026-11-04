CREATE OR REPLACE FUNCTION public.step_up_challenge_create(_action step_up_action, _target_ref text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$ SELECT public.generate_step_up_challenge(_action, _target_ref); $function$
