CREATE OR REPLACE FUNCTION public.fn_cron_guard(p_key bigint, p_sql text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF pg_try_advisory_xact_lock(p_key) THEN
    EXECUTE p_sql;
  ELSE
    RAISE NOTICE 'fn_cron_guard: job % ainda em execução, tick ignorado', p_key;
  END IF;
END;
$function$
