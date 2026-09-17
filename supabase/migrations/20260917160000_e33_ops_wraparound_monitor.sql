-- Rollback: DROP TABLE IF EXISTS ops.wraparound_monitor_log; SELECT cron.unschedule('wraparound-toast-sequence-monitor');
--
-- E33 — Monitor de wraparound, TOAST e sequências
-- Plano: docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md (E33)
-- Investigação: docs/E33_MONITOR_WRAPAROUND_2026-09-16.md
--
-- Cria a tabela `ops.wraparound_monitor_log`, alimentada diariamente por um
-- cron single-statement (padrão `fn_cron_safe_run` já usado em ~60 jobs
-- deste projeto) que faz snapshot de 4 famílias de métrica heterogêneas:
--   1) idade de XID do banco atual (`age(datfrozenxid)`)
--   2) idade de multixact do banco atual (`mxid_age(datminmxid)`)
--   3) uso de sequências int4/int2 vs. limite do tipo (`pg_sequences`)
--   4) WAL retido por replication slot (`pg_replication_slots`)
--   5) proporção TOAST/heap por tabela (top 10, TOAST > 1 MB)
-- Formato genérico (metric/object_name/value) escolhido porque nenhuma das
-- 4 famílias compartilha grão com `ops.table_size_history` (E30) — banco,
-- sequência, slot e tabela não cabem numa única forma tabular sem separar
-- o cron em múltiplos statements (proibido — ver E37, um erro no meio de
-- um bloco multi-statement aborta os statements seguintes sem registrar
-- falha). Consumida pelo workflow diário
-- `.github/workflows/wraparound-monitor-report.yml`
-- (scripts/wraparound-monitor-check.mjs), que compara a captura mais
-- recente contra os thresholds declarados e abre issue (`db-warning` ou
-- `db-critical`) se algum objeto estourar.
--
-- Depende do schema `ops` já existir — criado pela migration de E30
-- (20260916211500_e30_ops_table_size_history.sql). Se essa migration ainda
-- não foi aplicada, a precondição abaixo falha com mensagem explícita
-- (mesmo padrão de dependência que E40 já usa para o mesmo schema).
--
-- RLS deny-all intencional (padrão E19 — ver
-- .security/rls-no-policy-allowlist.json): tabela habilita RLS e não recebe
-- nenhuma policy. Só service_role/postgres (e a função SECURITY DEFINER
-- fn_cron_safe_run, que roda como owner da função, bypassrls) conseguem
-- gravar/ler. Nenhum GRANT para anon/authenticated — nem no schema (já
-- revogado por E30), nem na tabela.
--
-- p_key=167 escolhido após consultar cron.job ao vivo em 2026-09-16/17
-- (maior p_key em uso: 166, jobname 'fantasmas-deactivate-guard'; 167 era o
-- valor "a confirmar" já reservado para esta etapa em
-- docs/E33_MONITOR_WRAPAROUND_2026-09-16.md desde a investigação original;
-- 168 usado por E30 e 169 por E40, ambos preparados na mesma sessão — sem
-- colisão com nenhum dos dois; 200 reservado por E25) — reconfirmado ao
-- vivo nesta revisão: nenhum job usa p_key=167 hoje.
--
-- O corpo do cron usa dollar-quoting aninhado ($cron$...$cron$ para o
-- terceiro argumento de cron.schedule, $sql$...$sql$ para o p_sql de
-- fn_cron_safe_run) em vez de concatenação de literais com aspas simples
-- duplicadas (estilo usado em E40) — tags diferentes aninham sem conflito
-- e evitam a necessidade de escapar cada aspa simples do texto do SQL
-- interno. Texto completo validado localmente contra um Postgres 17
-- descartável (Docker) antes de commitar, mesmo método usado para validar
-- o SQL de E40.

DO $precondition$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'ops') THEN
    RAISE EXCEPTION 'Precondição falhou: schema ops não existe — aplique primeiro a migration de E30 (20260916211500_e30_ops_table_size_history.sql)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'ops' AND c.relname = 'wraparound_monitor_log'
  ) THEN
    RAISE EXCEPTION 'Precondição falhou: ops.wraparound_monitor_log já existe — migration não é idempotente para este passo';
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'wraparound-toast-sequence-monitor') THEN
    RAISE EXCEPTION 'Precondição falhou: já existe cron job "wraparound-toast-sequence-monitor"';
  END IF;
END;
$precondition$;

CREATE TABLE ops.wraparound_monitor_log (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  captured_at   timestamptz NOT NULL DEFAULT now(),
  metric        text NOT NULL,
  object_name   text,
  value_numeric numeric,
  value_pct     numeric,
  unit          text,
  detail        jsonb,
  CONSTRAINT wraparound_monitor_log_metric_check
    CHECK (metric IN ('xid_age', 'mxid_age', 'sequence_pct_used',
                       'replication_slot_retained_bytes', 'toast_pct_of_heap'))
);

CREATE INDEX idx_wraparound_monitor_log_metric_captured
  ON ops.wraparound_monitor_log (metric, captured_at DESC);

ALTER TABLE ops.wraparound_monitor_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ops.wraparound_monitor_log FROM PUBLIC;

COMMENT ON TABLE ops.wraparound_monitor_log IS
  'PLANO_DBA E33 — snapshot diário de risco de wraparound de XID/multixact, '
  'uso de sequências int4/int2, WAL retido por replication slot e proporção '
  'TOAST/heap (top 10), alimentada pelo cron wraparound-toast-sequence-monitor '
  '(fn_cron_safe_run p_key=167). RLS deny-all intencional (ver '
  '.security/rls-no-policy-allowlist.json) — só service_role/postgres lê/escreve; '
  'zero policies, sem GRANT a anon/authenticated. Consumida pelo workflow diário '
  'wraparound-monitor-report.yml (scripts/wraparound-monitor-check.mjs).';

SELECT cron.schedule(
  'wraparound-toast-sequence-monitor',
  '0 6 * * *',
  $cron$SELECT public.fn_cron_safe_run(
    167::bigint,
    $sql$
    INSERT INTO ops.wraparound_monitor_log (metric, object_name, value_numeric, value_pct, unit, detail)
    SELECT 'xid_age', current_database(), age(datfrozenxid)::numeric,
           round(100.0 * age(datfrozenxid) / 2000000000.0, 4), 'xid',
           jsonb_build_object('datfrozenxid', datfrozenxid)
    FROM pg_database WHERE datname = current_database()
    UNION ALL
    SELECT 'mxid_age', current_database(), mxid_age(datminmxid)::numeric,
           round(100.0 * mxid_age(datminmxid) / 2000000000.0, 4), 'mxid',
           jsonb_build_object('datminmxid', datminmxid)
    FROM pg_database WHERE datname = current_database()
    UNION ALL
    SELECT 'sequence_pct_used', s.schemaname || '.' || s.sequencename,
           COALESCE(s.last_value, 0)::numeric,
           round(100.0 * COALESCE(s.last_value, 0)::numeric / s.max_value::numeric, 4),
           'pct',
           jsonb_build_object('owner_table', c2.relname, 'owner_column', a.attname, 'seq_type', s.data_type)
    FROM pg_sequences s
    JOIN pg_namespace sn ON sn.nspname = s.schemaname
    JOIN pg_class sc ON sc.relname = s.sequencename AND sc.relnamespace = sn.oid
    LEFT JOIN pg_depend d ON d.objid = sc.oid AND d.deptype = 'a'
    LEFT JOIN pg_class c2 ON c2.oid = d.refobjid
    LEFT JOIN pg_attribute a ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
    WHERE s.data_type IN ('smallint', 'integer')
    UNION ALL
    SELECT 'replication_slot_retained_bytes', slot_name,
           pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)::numeric, NULL, 'bytes',
           jsonb_build_object('active', active, 'wal_status', wal_status)
    FROM pg_replication_slots
    UNION ALL
    (SELECT 'toast_pct_of_heap', c.oid::regclass::text,
           pg_relation_size(t.oid)::numeric,
           round(100.0 * pg_relation_size(t.oid) / NULLIF(pg_relation_size(c.oid), 0), 1), 'pct',
           jsonb_build_object('heap_bytes', pg_relation_size(c.oid), 'total_bytes', pg_total_relation_size(c.oid))
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_class t ON t.oid = c.reltoastrelid
    WHERE c.relkind = 'r' AND c.reltoastrelid <> 0
      AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      AND pg_relation_size(t.oid) > 1048576
    ORDER BY 4 DESC NULLS LAST
    LIMIT 10);
    $sql$,
    30000,
    'wraparound-monitor'
  );$cron$
);

DO $postcondition$
BEGIN
  IF to_regclass('ops.wraparound_monitor_log') IS NULL THEN
    RAISE EXCEPTION 'Pós-condição falhou: ops.wraparound_monitor_log não foi criada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'ops' AND c.relname = 'wraparound_monitor_log' AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Pós-condição falhou: RLS não está habilitada em ops.wraparound_monitor_log';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
             JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'ops' AND c.relname = 'wraparound_monitor_log') THEN
    RAISE EXCEPTION 'Pós-condição falhou: esperava zero policies em ops.wraparound_monitor_log (deny-all intencional)';
  END IF;

  IF has_table_privilege('anon', 'ops.wraparound_monitor_log', 'SELECT') THEN
    RAISE EXCEPTION 'Pós-condição falhou: anon não deveria ter SELECT em ops.wraparound_monitor_log';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'wraparound-toast-sequence-monitor' AND active) THEN
    RAISE EXCEPTION 'Pós-condição falhou: cron wraparound-toast-sequence-monitor não foi criado ou não está ativo';
  END IF;
END;
$postcondition$;
