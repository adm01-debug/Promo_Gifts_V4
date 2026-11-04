CREATE OR REPLACE FUNCTION public.cleanup_old_telemetry()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    DELETE FROM public.frontend_telemetry WHERE created_at < now() - interval '15 days';
    RETURN NEW;
END;
$function$
