-- PERF-002: corrige o job temporário (VACUUM não roda em bloco multi-statement) — arquivo espelho
-- STATUS: aplicada via MCP fora do fluxo em 2026-11-01 (E056) — registrada aqui só para fechar o drift.
-- NÃO reaplicar. Os dois jobs foram removidos por 20261101194100.
-- Rollback: SELECT cron.unschedule('vacuum-snapshots-now'); SELECT cron.unschedule('vacuum-daily-summary-now');
-- SQL idêntico ao de supabase_migrations.schema_migrations.statements (version 20261101193530).

SELECT cron.unschedule('vacuum-analyze-perf-now');
SELECT cron.schedule('vacuum-snapshots-now', '* * * * *', 'VACUUM ANALYZE public.stock_snapshots');
SELECT cron.schedule('vacuum-daily-summary-now', '* * * * *', 'VACUUM ANALYZE public.stock_daily_summary');
