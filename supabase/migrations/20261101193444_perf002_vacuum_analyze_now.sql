-- PERF-002: job temporário VACUUM ANALYZE (arquivo espelho do que rodou em produção)
-- STATUS: aplicada via MCP fora do fluxo em 2026-11-01 (E056) — registrada aqui só para fechar o drift.
-- NÃO reaplicar. O job foi removido por 20261101193530 / 20261101194100.
-- Rollback: SELECT cron.unschedule('vacuum-analyze-perf-now');
-- SQL idêntico ao de supabase_migrations.schema_migrations.statements (version 20261101193444).

SELECT cron.schedule(
  'vacuum-analyze-perf-now',
  '* * * * *',
  $$VACUUM ANALYZE public.stock_snapshots; VACUUM ANALYZE public.stock_daily_summary;$$
);
