-- Rollback: DROP TABLE IF EXISTS ops.table_size_history; SELECT cron.unschedule('table-size-history-daily'); DROP SCHEMA IF EXISTS ops;
--
-- E30 — Plano de capacidade e alerta de crescimento
-- Plano: docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md (E30)
-- Investigação: docs/E30_PLANO_CAPACIDADE_2026-09-16.md
--
-- Cria o schema `ops` (ainda não existe — confirmado via
-- information_schema.schemata em 2026-09-16, mesma checagem que a nota da
-- migration de E25 já deixou registrada) e a tabela `ops.table_size_history`,
-- alimentada diariamente por um cron single-statement (padrão
-- fn_cron_safe_run já usado em ~60 jobs deste projeto). Consumida pelo
-- workflow semanal `.github/workflows/capacity-growth-report.yml`
-- (scripts/capacity-growth-projection.mjs), que projeta 90 dias à frente e
-- abre issue se algum objeto público passar de 20% do banco ou 30%/mês de
-- crescimento.
--
-- RLS deny-all intencional (padrão E19 — ver
-- .security/rls-no-policy-allowlist.json): tabela habilita RLS e não recebe
-- nenhuma policy. Só service_role/postgres (e a função SECURITY DEFINER
-- fn_cron_safe_run, que roda como owner da função, bypassrls) conseguem
-- gravar/ler. Nenhum GRANT para anon/authenticated — nem no schema, nem na
-- tabela. Dado de telemetria interna de operação, não tem por que ser
-- alcançável pela API pública.
--
-- p_key=168 escolhido após consultar cron.job ao vivo em 2026-09-16 (maior
-- p_key em uso: 166, jobname 'fantasmas-deactivate-guard'; E33 reserva 167
-- para seu próprio monitor de wraparound quando aplicado; E25 já reservou
-- 200 numa migration própria ainda não aplicada) — sem colisão com nenhum
-- dos dois.

DO $precondition$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'ops') THEN
    RAISE EXCEPTION 'Precondição falhou: schema ops já existe — migration não é idempotente para este passo';
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'table-size-history-daily') THEN
    RAISE EXCEPTION 'Precondição falhou: já existe cron job "table-size-history-daily"';
  END IF;
END;
$precondition$;

CREATE SCHEMA ops;
REVOKE ALL ON SCHEMA ops FROM PUBLIC;
COMMENT ON SCHEMA ops IS
  'Telemetria operacional interna (série histórica de tamanho, monitores de manutenção). '
  'Nunca exposta à API pública — criado em 20260916211500 para E30 do '
  'PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md.';

CREATE TABLE ops.table_size_history (
  captured_at timestamptz NOT NULL DEFAULT now(),
  schema_name text NOT NULL,
  table_name text NOT NULL,
  total_bytes bigint NOT NULL,
  live_tup bigint NOT NULL,
  PRIMARY KEY (captured_at, schema_name, table_name)
);

CREATE INDEX idx_table_size_history_table_captured
  ON ops.table_size_history (schema_name, table_name, captured_at DESC);

ALTER TABLE ops.table_size_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ops.table_size_history FROM PUBLIC;

COMMENT ON TABLE ops.table_size_history IS
  'PLANO_DBA E30 — série histórica diária de pg_total_relation_size()/reltuples por '
  'tabela do schema public, alimentada pelo cron table-size-history-daily '
  '(fn_cron_safe_run p_key=168). RLS deny-all intencional (ver '
  '.security/rls-no-policy-allowlist.json) — só service_role/postgres lê/escreve; '
  'zero policies, sem GRANT a anon/authenticated. Consumida pelo workflow semanal '
  'capacity-growth-report.yml (scripts/capacity-growth-projection.mjs).';

SELECT cron.schedule(
  'table-size-history-daily',
  '17 3 * * *',
  $cron$SELECT public.fn_cron_safe_run(
    168::bigint,
    'INSERT INTO ops.table_size_history (schema_name, table_name, total_bytes, live_tup) '
    'SELECT n.nspname, c.relname, pg_total_relation_size(c.oid), c.reltuples::bigint '
    'FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace '
    'WHERE c.relkind IN (''r'',''p'') AND n.nspname = ''public'';',
    45000,
    'table-size-history'
  );$cron$
);

DO $postcondition$
BEGIN
  IF to_regclass('ops.table_size_history') IS NULL THEN
    RAISE EXCEPTION 'Pós-condição falhou: ops.table_size_history não foi criada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'ops' AND c.relname = 'table_size_history' AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Pós-condição falhou: RLS não está habilitada em ops.table_size_history';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
             JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'ops' AND c.relname = 'table_size_history') THEN
    RAISE EXCEPTION 'Pós-condição falhou: esperava zero policies em ops.table_size_history (deny-all intencional)';
  END IF;

  IF has_table_privilege('anon', 'ops.table_size_history', 'SELECT') THEN
    RAISE EXCEPTION 'Pós-condição falhou: anon não deveria ter SELECT em ops.table_size_history';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'table-size-history-daily' AND active) THEN
    RAISE EXCEPTION 'Pós-condição falhou: cron table-size-history-daily não foi criado ou não está ativo';
  END IF;
END;
$postcondition$;
