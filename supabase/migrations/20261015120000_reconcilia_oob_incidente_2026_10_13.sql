-- Reconciliação B2 (2026-10-15): registra em migration versionada o estado que o incidente
-- 2026-10-13 aplicou em doufsxqlfjyuvxuezpln FORA de qualquer migration (MCP execute_sql),
-- sem linha no ledger. Estado vivo conferido via pg_policies / cron.job em 2026-10-15.
--
-- Em produção este arquivo é NO-OP: cada statement leva o objeto ao valor que ele já tem.
-- Serve para que o repo descreva o banco (ambiente novo / replay) e para fechar o drift.
-- Origem: seção 1 do antigo 20261013141300_fase3_rls_performance.sql (policy
-- variant_stocks_select_org) e seções 1-6 do antigo 20261013141700_fase6_cron_pipelines.sql
--   git show 1b59d0f:supabase/migrations/20261013141300_fase3_rls_performance.sql
--   git show 1b59d0f:supabase/migrations/20261013141700_fase6_cron_pipelines.sql
--
-- Aplicação: só via .github/workflows/db-apply-migration.yml (REGRA #8 / E15).
--
-- Rollback: valores anteriores ao incidente (não recomendado; reabre os timeouts medidos):
--   variant_stocks_select_org USING (user_belongs_to_org(organization_id));
--   kit-ficha-parse-site command 'SELECT public.fn_parse_xbz_ficha_site_batch();';
--   reposicao-backfill-hourly '5 * * * *'; hash-product-images '*/2 * * * *';
--   anon-insert-rate-purge '*/10 * * * *'; cleanup-stale-ai-pending-logs '3,13,23,33,43,53 * * * *';
--   refresh-analytics-mv-stock-velocity / -product-intelligence active := true.

ALTER POLICY variant_stocks_select_org ON public.variant_supplier_sources
  USING (
    organization_id IN (
      SELECT uo.organization_id
      FROM public.user_organizations uo
      WHERE uo.user_id = (SELECT auth.uid())
    )
  );

SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'kit-ficha-parse-site'),
  command := 'SELECT public.fn_parse_xbz_ficha_site_batch(p_limit := 50);'
);

SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'reposicao-backfill-hourly'),
  schedule := '42 * * * *'
);

SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'hash-product-images'),
  schedule := '*/5 * * * *'
);

SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'anon-insert-rate-purge'),
  schedule := '*/15 * * * *'
);

SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-stale-ai-pending-logs'),
  schedule := '3,18,33,48 * * * *'
);

-- refresh_all_materialized_views() (hourly) já refresca as duas MVs; os jobs dedicados ficam
-- desativados (não removidos) para rollback simples.
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'refresh-analytics-mv-stock-velocity'),
  active := false
);

SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'refresh-analytics-mv-product-intelligence'),
  active := false
);
