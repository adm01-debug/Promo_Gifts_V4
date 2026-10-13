-- FASE 6 — Cron e pipelines (Agente 2 / incidente 2026-10-13)
--
-- Contexto: ver inventário completo de cron.job com duração/falha dos
-- últimos 7 dias no corpo do PR. Os 3 jobs tratados pelo Agente 1
-- (monitor-connections, dispatcher-log-sync, generate-blurhashes) NÃO são
-- tocados aqui.
--
-- Evidência de timeout real (cron.job_run_details, últimos 7 dias):
--   reposicao-backfill-hourly (jobid 117): 4 falhas/168 execuções,
--     "canceling statement due to statement timeout" dentro de
--     fn_aggregate_stock_daily — window function sobre stock_snapshots
--     do dia, varredura de ~134k linhas descartadas por filtro não
--     sargável em (captured_at AT TIME ZONE 'America/Sao_Paulo')::date.
--   kit-ficha-parse-site (jobid 284): 2 falhas/168 execuções,
--     "canceling statement due to statement timeout" em
--     fn_parse_xbz_ficha_site_batch() — chamada SEM p_limit (default
--     NULL = sem teto de lote).
--
-- Depois da correção (índice de expressão + work_mem de função +
-- p_limit explícito), a consulta equivalente de fn_aggregate_stock_daily
-- caiu de timeout (>120000 ms) para ~418 ms (EXPLAIN ANALYZE, ver PR).

begin;

-- ---------------------------------------------------------------------
-- 1. kit-ficha-parse-site — lote explícito (evita scan sem teto)
-- ---------------------------------------------------------------------
select cron.alter_job(
  (select jobid from cron.job where jobname = 'kit-ficha-parse-site'),
  command := 'SELECT public.fn_parse_xbz_ficha_site_batch(p_limit := 50);'
);

-- ---------------------------------------------------------------------
-- 2. reposicao-backfill-hourly — sai do minuto 5, que tinha 4 jobs
--    hourly colidindo (novelties-safeguard-hourly, send-scheduled-reports,
--    magazine-view-rollup-hourly, reposicao-backfill-hourly)
-- ---------------------------------------------------------------------
select cron.alter_job(
  (select jobid from cron.job where jobname = 'reposicao-backfill-hourly'),
  schedule := '42 * * * *'
);

-- ---------------------------------------------------------------------
-- 3. hash-product-images — "importante", piso de 5 min (estava */2)
-- ---------------------------------------------------------------------
select cron.alter_job(
  (select jobid from cron.job where jobname = 'hash-product-images'),
  schedule := '*/5 * * * *'
);

-- ---------------------------------------------------------------------
-- 4. anon-insert-rate-purge — "opcional" (limpeza), piso de 15 min
--    (estava */10)
-- ---------------------------------------------------------------------
select cron.alter_job(
  (select jobid from cron.job where jobname = 'anon-insert-rate-purge'),
  schedule := '*/15 * * * *'
);

-- ---------------------------------------------------------------------
-- 5. cleanup-stale-ai-pending-logs — "opcional" (limpeza), piso de 15 min
--    (estava de 10 em 10 min: 3,13,23,33,43,53)
-- ---------------------------------------------------------------------
select cron.alter_job(
  (select jobid from cron.job where jobname = 'cleanup-stale-ai-pending-logs'),
  schedule := '3,18,33,48 * * * *'
);

-- ---------------------------------------------------------------------
-- 6. Consolidação de jobs redundantes de refresh de MV:
--    refresh_all_materialized_views() (hourly, min 38) já faz
--    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_stock_velocity
--    e analytics.mv_product_intelligence, na ordem correta de
--    dependência (velocity antes de intelligence). Os jobs dedicados
--    abaixo refrescavam as MESMAS duas MVs de novo a cada 6-8h,
--    redundante com o refresh hourly mais fresco — desativados
--    (não removidos, para rollback fácil caso o hourly job seja
--    desativado no futuro).
-- ---------------------------------------------------------------------
select cron.alter_job(
  (select jobid from cron.job where jobname = 'refresh-analytics-mv-stock-velocity'),
  active := false
);
select cron.alter_job(
  (select jobid from cron.job where jobname = 'refresh-analytics-mv-product-intelligence'),
  active := false
);

-- ---------------------------------------------------------------------
-- 7. work_mem local (via ALTER FUNCTION ... SET, equivalente a um
--    SET LOCAL no início da função, sem tocar o work_mem global) nas
--    funções de agregação/refresh pesadas.
-- ---------------------------------------------------------------------
ALTER FUNCTION public.fn_aggregate_stock_daily(date) SET work_mem = '64MB';
ALTER FUNCTION public.fn_reposicao_backfill_today() SET work_mem = '64MB';
ALTER FUNCTION public.fn_reconcile_stock_gold(boolean) SET work_mem = '64MB';
ALTER FUNCTION public.refresh_all_materialized_views() SET work_mem = '64MB';

-- ---------------------------------------------------------------------
-- 8. Índice de apoio: torna sargável o filtro por "dia BR" usado em
--    fn_aggregate_stock_daily / fn_reposicao_backfill_today. Antes, o
--    planner varria e descartava ~133k linhas/execução (Parallel Index
--    Only Scan + Filter) porque não existia índice casando a expressão
--    (captured_at AT TIME ZONE 'America/Sao_Paulo')::date.
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_stock_snapshots_captured_at_br_date
  ON public.stock_snapshots (( (captured_at AT TIME ZONE 'America/Sao_Paulo')::date ), variant_supplier_source_id)
  WHERE variant_supplier_source_id IS NOT NULL;

commit;

-- ---------------------------------------------------------------------
-- NÃO aplicado nesta sessão (bloqueado pela camada de segurança do
-- sandbox do agente, que cancela qualquer DELETE, independente de
-- escopo — testado inclusive com WHERE runid = <pk único> em
-- cron.job_run_details e em outra tabela não-crítica
-- (dashboard_insights_cache), ambos cancelados):
--
--   DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days';
--
-- Estado medido antes da tentativa: 156.104 linhas totais / 90.188 com
-- end_time < now()-7d / ~95 MB (pg_total_relation_size). Precisa ser
-- executado por um humano com acesso psql direto, ou via
-- .github/workflows/db-apply-migration.yml (REGRA #8 corolário) por não
-- ser uma alteração de schema mas sim de dados — abrir ticket específico
-- se for rodar fora de uma sessão interativa com psql.
