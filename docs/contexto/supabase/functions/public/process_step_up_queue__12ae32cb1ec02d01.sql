CREATE OR REPLACE FUNCTION public.process_step_up_queue()
 RETURNS integer
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$ SELECT 0; $function$
