CREATE OR REPLACE FUNCTION public.next_in_step_up_queue()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$ SELECT '{}'::jsonb; $function$
