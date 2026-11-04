CREATE OR REPLACE FUNCTION public.fn_cron_safe_run(p_key bigint, p_sql text, p_timeout_ms integer DEFAULT 45000, p_job_label text DEFAULT 'cron'::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE v_start timestamptz := clock_timestamp(); v_duration_ms int;
BEGIN
  IF NOT pg_try_advisory_xact_lock(p_key) THEN
    RETURN format('[%s] SKIP: job ainda em execução (lock=%s)', p_job_label, p_key);
  END IF;
  EXECUTE format('SET LOCAL statement_timeout = %L', p_timeout_ms || 'ms');
  EXECUTE p_sql;
  v_duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_start)) * 1000;
  RETURN format('[%s] OK: %sms', p_job_label, v_duration_ms);
EXCEPTION
  WHEN query_canceled THEN
    RAISE WARNING 'fn_cron_safe_run [%] TIMEOUT após %ms (limite=%ms)', p_job_label,
      EXTRACT(EPOCH FROM (clock_timestamp() - v_start))::int * 1000, p_timeout_ms;
    RETURN format('[%s] TIMEOUT após %sms (limite=%sms)', p_job_label,
      EXTRACT(EPOCH FROM (clock_timestamp() - v_start))::int * 1000, p_timeout_ms);
  WHEN OTHERS THEN
    RAISE WARNING 'fn_cron_safe_run [%] ERRO: %', p_job_label, SQLERRM;
    RETURN format('[%s] ERRO: %s', p_job_label, SQLERRM);
END; $function$
