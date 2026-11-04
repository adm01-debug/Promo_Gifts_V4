CREATE OR REPLACE FUNCTION public.purge_expired_security_data()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_purged_step_up integer;
  v_purged_logins  integer;
BEGIN
  v_purged_step_up := public.purge_expired_step_up_artifacts();

  DELETE FROM public.login_attempts
   WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_purged_logins = ROW_COUNT;

  -- Telemetria leve em audit_log para diagnóstico futuro
  PERFORM 1; -- placeholder; o ROW_COUNT serve aos logs do cron
END;
$function$
