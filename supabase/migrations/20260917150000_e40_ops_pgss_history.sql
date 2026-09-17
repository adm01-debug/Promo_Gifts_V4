-- Rollback: DROP TABLE IF EXISTS ops.pgss_history; SELECT cron.unschedule('pgss-history-weekly');
--
-- E40 — Baseline de desempenho e SLO por RPC crítica
-- Plano: docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md (E40)
-- Investigação: docs/E40_BASELINE_DESEMPENHO_SLO_2026-09-17.md
--
-- Cria a tabela `ops.pgss_history`, alimentada semanalmente por um cron
-- single-statement (padrão fn_cron_safe_run já usado em ~60 jobs deste
-- projeto) que faz snapshot de `extensions.pg_stat_statements` filtrado ao
-- padrão `pgrst_call` (chamadas roteadas por PostgREST — exclui jobs
-- internos/cron que chamam a função diretamente). Consumida pelo workflow
-- semanal `.github/workflows/pgss-slo-report.yml`
-- (scripts/pgss-slo-check.mjs), que compara a captura mais recente de cada
-- RPC monitorada contra o SLO declarado e abre issue se alguma estourar.
--
-- Depende do schema `ops` já existir — criado pela migration de E30
-- (20260916211500_e30_ops_table_size_history.sql). Se essa migration ainda
-- não foi aplicada, a precondição abaixo falha com mensagem explícita
-- (inverso da precondição de E30, que exigia o schema NÃO existir ainda).
--
-- `pg_stat_statements` não expõe percentil nativamente (só min/mean/max/
-- stddev por statement) — p95 é aproximado no script de checagem por
-- `mean + 1.645 * stddev`, limitação documentada no doc de investigação
-- (mesma honestidade sobre método aproximado que E30 já registrou para sua
-- regressão linear).
--
-- RLS deny-all intencional (padrão E19 — ver
-- .security/rls-no-policy-allowlist.json): tabela habilita RLS e não recebe
-- nenhuma policy. Só service_role/postgres (e a função SECURITY DEFINER
-- fn_cron_safe_run, que roda como owner da função, bypassrls) conseguem
-- gravar/ler. Nenhum GRANT para anon/authenticated — nem no schema (já
-- revogado por E30), nem na tabela.
--
-- p_key=169 escolhido após consultar cron.job ao vivo em 2026-09-16/17
-- (maior p_key em uso: 166, jobname 'fantasmas-deactivate-guard'; 167
-- reservado por E33; 168 usado por E30 — este pacote, ambos ainda
-- aguardando aprovação do PO; 200 reservado por E25) — sem colisão com
-- nenhum dos três.
--
-- ATENÇÃO: esta migration NÃO chama pg_stat_statements_reset(). O reset
-- (ação distinta do checklist de E40, destrutiva para os agregados
-- históricos) permanece como decisão separada, a ser aprovada pelo PO
-- depois que houver pelo menos uma captura em ops.pgss_history — ver
-- docs/E40_BASELINE_DESEMPENHO_SLO_2026-09-17.md.

DO $precondition$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'ops') THEN
    RAISE EXCEPTION 'Precondição falhou: schema ops não existe — aplique primeiro a migration de E30 (20260916211500_e30_ops_table_size_history.sql)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'ops' AND c.relname = 'pgss_history'
  ) THEN
    RAISE EXCEPTION 'Precondição falhou: ops.pgss_history já existe — migration não é idempotente para este passo';
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pgss-history-weekly') THEN
    RAISE EXCEPTION 'Precondição falhou: já existe cron job "pgss-history-weekly"';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_stat_statements' AND n.nspname = 'extensions'
  ) THEN
    RAISE EXCEPTION 'Precondição falhou: extensão pg_stat_statements não está instalada em extensions (confirmado ao vivo em 2026-09-17 — se isso mudou, revisar a migration antes de aplicar)';
  END IF;
END;
$precondition$;

CREATE TABLE ops.pgss_history (
  captured_at timestamptz NOT NULL DEFAULT now(),
  queryid bigint NOT NULL,
  fn_name text,
  calls bigint NOT NULL,
  total_exec_time double precision NOT NULL,
  mean_exec_time double precision NOT NULL,
  stddev_exec_time double precision NOT NULL,
  max_exec_time double precision NOT NULL,
  PRIMARY KEY (captured_at, queryid)
);

CREATE INDEX idx_pgss_history_fn_captured
  ON ops.pgss_history (fn_name, captured_at DESC);

ALTER TABLE ops.pgss_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ops.pgss_history FROM PUBLIC;

COMMENT ON TABLE ops.pgss_history IS
  'PLANO_DBA E40 — snapshot semanal de extensions.pg_stat_statements (filtrado a '
  'query ILIKE ''%pgrst_call%'', só chamadas roteadas por PostgREST) por RPC, '
  'alimentada pelo cron pgss-history-weekly (fn_cron_safe_run p_key=169). RLS '
  'deny-all intencional (ver .security/rls-no-policy-allowlist.json) — só '
  'service_role/postgres lê/escreve; zero policies, sem GRANT a '
  'anon/authenticated. Consumida pelo workflow semanal pgss-slo-report.yml '
  '(scripts/pgss-slo-check.mjs).';

SELECT cron.schedule(
  'pgss-history-weekly',
  '41 3 * * 1',
  $cron$SELECT public.fn_cron_safe_run(
    169::bigint,
    'INSERT INTO ops.pgss_history (queryid, fn_name, calls, total_exec_time, mean_exec_time, stddev_exec_time, max_exec_time) '
    'SELECT queryid, coalesce((regexp_match(query, ''"public"\."([a-zA-Z0-9_]+)"''))[1], (regexp_match(query, ''FROM ([a-zA-Z0-9_]+)\(''))[1]) AS fn_name, '
    'calls, total_exec_time, mean_exec_time, stddev_exec_time, max_exec_time '
    'FROM extensions.pg_stat_statements '
    'WHERE query ILIKE ''%pgrst_call%'';',
    45000,
    'pgss-history-weekly'
  );$cron$
);

DO $postcondition$
BEGIN
  IF to_regclass('ops.pgss_history') IS NULL THEN
    RAISE EXCEPTION 'Pós-condição falhou: ops.pgss_history não foi criada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'ops' AND c.relname = 'pgss_history' AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Pós-condição falhou: RLS não está habilitada em ops.pgss_history';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
             JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'ops' AND c.relname = 'pgss_history') THEN
    RAISE EXCEPTION 'Pós-condição falhou: esperava zero policies em ops.pgss_history (deny-all intencional)';
  END IF;

  IF has_table_privilege('anon', 'ops.pgss_history', 'SELECT') THEN
    RAISE EXCEPTION 'Pós-condição falhou: anon não deveria ter SELECT em ops.pgss_history';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pgss-history-weekly' AND active) THEN
    RAISE EXCEPTION 'Pós-condição falhou: cron pgss-history-weekly não foi criado ou não está ativo';
  END IF;
END;
$postcondition$;
