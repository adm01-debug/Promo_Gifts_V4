CREATE OR REPLACE FUNCTION public.save_step_up_audit(_event_type text, _action step_up_action DEFAULT NULL::step_up_action, _metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$ SELECT public.log_step_up_audit(_event_type, _action, _metadata); $function$
