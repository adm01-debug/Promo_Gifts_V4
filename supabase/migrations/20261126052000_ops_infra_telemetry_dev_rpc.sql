-- OPS-UI — tela "Infra do Banco" (/admin/infra-ops, DevRoute): única tela para a
-- telemetria operacional interna que hoje só existe como relatório de CI.
--   ops.table_size_history     (E30, cron table-size-history-daily)
--   ops.pgss_history           (E40, cron pgss-history-weekly)
--   ops.wraparound_monitor_log (E33, cron wraparound-toast-sequence-monitor)
-- Por que RPC e não policy: o schema ops é deny-all por decisão registrada em
--   .security/rls-no-policy-allowlist.json e não está exposto no db-schema do
--   PostgREST. Uma RPC SECURITY DEFINER em public mantém o deny-all (nenhuma das
--   três tabelas ganha GRANT a anon/authenticated) e devolve só agregados.
-- Guard: papel dev — mesma regra do <DevRoute /> que protege /admin/infra-ops e
--   do fn_dev_medallion_health(); 42501 para os demais.
-- Rollback: DROP FUNCTION IF EXISTS public.fn_dev_ops_infra_telemetry(integer, integer);
--   (arquivo supabase/rollbacks/20261126052000_rollback.sql)

CREATE OR REPLACE FUNCTION public.fn_dev_ops_infra_telemetry(_days integer DEFAULT 30, _top integer DEFAULT 15)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_days integer := GREATEST(LEAST(COALESCE(_days, 30), 365), 1);
  v_top integer := GREATEST(LEAST(COALESCE(_top, 15), 50), 1);
  v_since timestamptz := now() - make_interval(days => v_days);
  v_size_at timestamptz;
  v_pgss_at timestamptz;
  v_wrap_at timestamptz;
BEGIN
  IF v_uid IS NULL OR NOT public.is_dev(v_uid) THEN
    RAISE EXCEPTION 'forbidden: requer papel dev' USING ERRCODE = '42501';
  END IF;

  SELECT max(captured_at) INTO v_size_at FROM ops.table_size_history;
  SELECT max(captured_at) INTO v_pgss_at FROM ops.pgss_history;
  SELECT max(captured_at) INTO v_wrap_at FROM ops.wraparound_monitor_log;

  RETURN jsonb_build_object(
    'window_days', v_days,
    'captured_at', jsonb_build_object(
      'table_size', to_jsonb(v_size_at),
      'pgss', to_jsonb(v_pgss_at),
      'wraparound', to_jsonb(v_wrap_at)
    ),
    'table_growth', COALESCE((
      SELECT jsonb_agg(to_jsonb(g) ORDER BY g.delta_bytes DESC)
      FROM (
        SELECT l.schema_name, l.table_name,
               f.total_bytes AS first_bytes,
               l.total_bytes AS last_bytes,
               (l.total_bytes - f.total_bytes) AS delta_bytes,
               l.live_tup,
               f.captured_at AS first_captured_at,
               l.captured_at AS last_captured_at
        FROM (
          SELECT DISTINCT ON (h.schema_name, h.table_name)
                 h.schema_name, h.table_name, h.total_bytes, h.captured_at
          FROM ops.table_size_history h
          WHERE h.captured_at >= v_since
          ORDER BY h.schema_name, h.table_name, h.captured_at ASC
        ) f
        JOIN (
          SELECT DISTINCT ON (h.schema_name, h.table_name)
                 h.schema_name, h.table_name, h.total_bytes, h.live_tup, h.captured_at
          FROM ops.table_size_history h
          WHERE h.captured_at >= v_since
          ORDER BY h.schema_name, h.table_name, h.captured_at DESC
        ) l USING (schema_name, table_name)
        ORDER BY (l.total_bytes - f.total_bytes) DESC
        LIMIT v_top
      ) g
    ), '[]'::jsonb),
    'pgss_summary', COALESCE((
      SELECT jsonb_build_object(
        'labels', count(DISTINCT COALESCE(p.fn_name, 'queryid ' || p.queryid::text)),
        'calls', COALESCE(sum(p.calls), 0),
        'total_exec_time', COALESCE(sum(p.total_exec_time), 0)
      )
      FROM ops.pgss_history p
      WHERE p.captured_at = v_pgss_at
    ), '{}'::jsonb),
    'pgss_top', COALESCE((
      SELECT jsonb_agg(to_jsonb(p) ORDER BY p.total_exec_time DESC)
      FROM (
        SELECT COALESCE(p.fn_name, 'queryid ' || p.queryid::text) AS label,
               p.fn_name, p.queryid, p.calls, p.total_exec_time,
               p.mean_exec_time, p.max_exec_time
        FROM ops.pgss_history p
        WHERE p.captured_at = v_pgss_at
        ORDER BY p.total_exec_time DESC
        LIMIT v_top
      ) p
    ), '[]'::jsonb),
    'wraparound', COALESCE((
      SELECT jsonb_agg(to_jsonb(w) ORDER BY w.metric, w.value_pct DESC NULLS LAST, w.object_name)
      FROM (
        SELECT DISTINCT ON (w.metric, w.object_name)
               w.metric, w.object_name, w.value_numeric, w.value_pct, w.unit
        FROM ops.wraparound_monitor_log w
        WHERE w.captured_at = v_wrap_at
        ORDER BY w.metric, w.object_name, w.captured_at DESC
      ) w
    ), '[]'::jsonb)
  );
END;
$$;

COMMENT ON FUNCTION public.fn_dev_ops_infra_telemetry(integer, integer) IS
  'Telemetria operacional interna (schema ops: E30 table_size_history, E40 pgss_history, E33 wraparound_monitor_log) '
  'para a tela /admin/infra-ops. Só papel dev (42501 para os demais). O schema ops segue deny-all e sem GRANT a '
  'anon/authenticated; esta RPC devolve apenas agregados (top _top itens na janela de _days dias).';

REVOKE ALL ON FUNCTION public.fn_dev_ops_infra_telemetry(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_dev_ops_infra_telemetry(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_dev_ops_infra_telemetry(integer, integer) TO authenticated;
