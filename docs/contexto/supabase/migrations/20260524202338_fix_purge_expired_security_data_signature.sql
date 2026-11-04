CREATE OR REPLACE FUNCTION public.purge_expired_security_data()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  PERFORM public.purge_expired_step_up_artifacts();
  DELETE FROM public.login_attempts WHERE created_at < now() - interval '90 days';
END;
$function$;
