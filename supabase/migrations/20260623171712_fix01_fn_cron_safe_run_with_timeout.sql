
-- =============================================================
-- FIX #01: fn_cron_safe_run — Guard universal com timeout
-- Previne: sobreposição de execuções, conexões presas, cascata
-- =============================================================

CREATE OR REPLACE FUNCTION public.fn_cron_safe_run(
  p_key          bigint,
  p_sql          text,
  p_timeout_ms   int  DEFAULT 45000,   -- 45s default, sobra 15s antes do próximo tick
  p_job_label    text DEFAULT 'cron'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start timestamptz := clock_timestamp();
  v_duration_ms int;
BEGIN
  -- Advisory lock transacional: se o tick anterior ainda roda, pula sem empilhar
  IF NOT pg_try_advisory_xact_lock(p_key) THEN
    RETURN format('[%s] SKIP: job ainda em execução (lock=%s)', p_job_label, p_key);
  END IF;

  -- Aplica timeout local para esta execução
  EXECUTE format('SET LOCAL statement_timeout = %L', p_timeout_ms || 'ms');

  -- Executa o SQL do job
  EXECUTE p_sql;

  v_duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_start)) * 1000;
  RETURN format('[%s] OK: %sms', p_job_label, v_duration_ms);

EXCEPTION
  WHEN query_canceled THEN
    RETURN format('[%s] TIMEOUT após %sms (limite=%sms)', p_job_label, 
      EXTRACT(EPOCH FROM (clock_timestamp() - v_start))::int * 1000, p_timeout_ms);
  WHEN OTHERS THEN
    RETURN format('[%s] ERRO: %s', p_job_label, SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.fn_cron_safe_run IS 
  'Guard universal para cron jobs: advisory lock anti-sobreposição + statement_timeout local + label de log. '
  'Substitui fn_cron_guard com proteção completa contra connection leak.';

-- Garantir que a função antiga continua funcionando (retrocompatibilidade)
CREATE OR REPLACE FUNCTION public.fn_cron_guard(p_key bigint, p_sql text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF pg_try_advisory_xact_lock(p_key) THEN
    EXECUTE p_sql;
  ELSE
    RAISE NOTICE 'fn_cron_guard: job % ainda em execução, tick ignorado', p_key;
  END IF;
END;
$$;
;
