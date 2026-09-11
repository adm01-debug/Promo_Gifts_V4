
-- =============================================================
-- FIX #11: Sistema de monitoramento + alerta de conexões
-- Cria: tabela de snapshots, função de coleta, cron de alerta
-- =============================================================

-- Tabela para snapshots de conexões
CREATE TABLE IF NOT EXISTS public.db_connection_snapshots (
  id              bigserial PRIMARY KEY,
  captured_at     timestamptz DEFAULT now(),
  total_conns     int,
  active_conns    int,
  idle_in_tx_conns int,
  max_conns       int,
  usage_pct       numeric(5,2),
  top_users       jsonb,
  alert_sent      boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_db_conn_snapshots_captured 
  ON public.db_connection_snapshots(captured_at DESC);

-- Purge automático: manter só 7 dias
CREATE OR REPLACE FUNCTION public.fn_capture_connection_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total     int;
  v_active    int;
  v_idle_tx   int;
  v_max       int;
  v_pct       numeric(5,2);
  v_top_users jsonb;
  v_result    jsonb;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE state = 'active'),
    COUNT(*) FILTER (WHERE state = 'idle in transaction'),
    (SELECT setting::int FROM pg_settings WHERE name = 'max_connections')
  INTO v_total, v_active, v_idle_tx, v_max
  FROM pg_stat_activity
  WHERE pid != pg_backend_pid();

  v_pct := ROUND((v_total::numeric / NULLIF(v_max, 0)) * 100, 2);

  SELECT jsonb_agg(row_to_json(t)) INTO v_top_users
  FROM (
    SELECT usename, state, COUNT(*) as n
    FROM pg_stat_activity
    WHERE pid != pg_backend_pid()
    GROUP BY usename, state
    ORDER BY n DESC
    LIMIT 8
  ) t;

  INSERT INTO public.db_connection_snapshots
    (total_conns, active_conns, idle_in_tx_conns, max_conns, usage_pct, top_users)
  VALUES
    (v_total, v_active, v_idle_tx, v_max, v_pct, v_top_users);

  -- Purge de snapshots > 7 dias
  DELETE FROM public.db_connection_snapshots
  WHERE captured_at < now() - interval '7 days';

  v_result := jsonb_build_object(
    'total', v_total, 'active', v_active, 'idle_in_tx', v_idle_tx,
    'max', v_max, 'usage_pct', v_pct,
    'alert', v_pct >= 75
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.fn_capture_connection_snapshot IS
  'Captura snapshot de conexões do banco. Alerta quando uso >= 75%. '
  'Chamado a cada 1 minuto pelo cron monitor-connections.';

-- View para dashboards
CREATE OR REPLACE VIEW public.v_connection_health AS
SELECT
  captured_at,
  total_conns,
  active_conns,
  idle_in_tx_conns,
  max_conns,
  usage_pct,
  CASE
    WHEN usage_pct >= 90 THEN '🔴 CRÍTICO'
    WHEN usage_pct >= 75 THEN '🟠 ALERTA'
    WHEN usage_pct >= 50 THEN '🟡 ATENÇÃO'
    ELSE '🟢 NORMAL'
  END AS status,
  top_users
FROM public.db_connection_snapshots
ORDER BY captured_at DESC
LIMIT 60;

-- Cron de monitoramento: a cada 1 minuto (não frequente o suficiente para ser problema)
SELECT cron.schedule(
  'monitor-connections',
  '* * * * *',
  'SELECT public.fn_capture_connection_snapshot();'
);
;
