CREATE OR REPLACE FUNCTION public.track_voice_command(_transcript text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$ SELECT public.log_voice_command(_transcript); $function$
