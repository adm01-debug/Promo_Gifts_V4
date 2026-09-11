
-- ============================================================
-- BUG FIX B1 + B2: fn_cron_safe_run v2
-- Correções:
--   B1: usar set_config(..., true) em vez de SET LOCAL via EXECUTE
--       set_config com is_local=true é transaction-local E aplicado
--       a todas as SPI calls subsequentes na mesma transação
--   B2: duração correta: (epoch * 1000)::int em vez de epoch::int * 1000
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_cron_safe_run(
  p_key        bigint,
  p_sql        text,
  p_timeout_ms int  DEFAULT 45000,
  p_job_label  text DEFAULT 'cron'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start      timestamptz := clock_timestamp();
  v_duration_ms bigint;
BEGIN
  -- 1. Advisory lock transacional: evita sobreposição entre ticks
  IF NOT pg_try_advisory_xact_lock(p_key) THEN
    RETURN format('[%s] SKIP: job ainda em execução (lock=%s)', p_job_label, p_key);
  END IF;

  -- 2. Aplicar timeout via set_config (transaction-local = true)
  --    set_config propaga o valor para SPI calls subsequentes,
  --    ao contrário de EXECUTE 'SET LOCAL' que reinicia o timer apenas
  --    para a statement-cliente, não para sub-statements SPI
  PERFORM set_config('statement_timeout', p_timeout_ms::text, true);

  -- 3. Executar payload do cron job
  EXECUTE p_sql;

  -- 4. B2 FIX: calcular duração em ms sem truncar double → int prematuramente
  v_duration_ms := ROUND(EXTRACT(EPOCH FROM (clock_timestamp() - v_start)) * 1000);
  RETURN format('[%s] OK: %sms', p_job_label, v_duration_ms);

EXCEPTION
  WHEN query_canceled THEN
    v_duration_ms := ROUND(EXTRACT(EPOCH FROM (clock_timestamp() - v_start)) * 1000);
    RETURN format('[%s] TIMEOUT após %sms (limite=%sms)',
      p_job_label, v_duration_ms, p_timeout_ms);
  WHEN OTHERS THEN
    v_duration_ms := ROUND(EXTRACT(EPOCH FROM (clock_timestamp() - v_start)) * 1000);
    RETURN format('[%s] ERRO após %sms: %s', p_job_label, v_duration_ms, SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.fn_cron_safe_run IS
  'v2 — Guard universal para cron jobs. '
  'Correções: (B1) timeout via set_config(is_local=true) propaga corretamente '
  'para SPI calls internas; (B2) duração em ms sem truncamento prematuro.';
;
