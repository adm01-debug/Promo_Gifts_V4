-- FIX: fn_cron_watchdog — SECURITY DEFINER sem search_path (schema injection vulnerability)
-- Função nova detectada em auditoria Round 5. Acessa pg_stat_activity + public.*
CREATE OR REPLACE FUNCTION public.fn_cron_watchdog()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_killed int := 0; v_result jsonb; v_rec record;
BEGIN
  FOR v_rec IN
    SELECT a.pid, a.query, a.query_start,
      ROUND(EXTRACT(EPOCH FROM (now() - a.query_start)) * 1000)::bigint AS duration_ms,
      (regexp_match(a.query, '''([^'']+)'''))[1] AS job_label,
      COALESCE(
        (SELECT m.timeout_sec FROM public.cron_job_timeout_map m
         WHERE a.query ILIKE '%' || m.jobname || '%' LIMIT 1), 55
      ) AS timeout_sec
    FROM pg_stat_activity a
    WHERE a.application_name = 'pg_cron' AND a.state = 'active'
      AND a.query_start IS NOT NULL
      AND a.query NOT ILIKE '%fn_cron_watchdog%'
      AND a.pid != pg_backend_pid()
  LOOP
    IF v_rec.duration_ms > (v_rec.timeout_sec * 1000) THEN
      INSERT INTO public.cron_watchdog_log
        (pid, jobname, query_start, duration_ms, query_preview)
      VALUES (v_rec.pid, COALESCE(v_rec.job_label,'unknown'),
              v_rec.query_start, v_rec.duration_ms, LEFT(v_rec.query,200));
      PERFORM pg_cancel_backend(v_rec.pid);
      v_killed := v_killed + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('killed', v_killed, 'action',
    CASE WHEN v_killed > 0 THEN 'KILLED:'||v_killed ELSE 'ALL_OK' END);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END; $function$;;
