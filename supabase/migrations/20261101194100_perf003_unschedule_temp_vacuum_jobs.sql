-- PERF-003 cleanup: remove cron jobs temporários de VACUUM one-shot
-- Os jobs vacuum-snapshots-now e vacuum-daily-summary-now foram criados
-- para executar VACUUM ANALYZE imediato após auditoria PERF-003.
-- Ambos executaram com sucesso (status=succeeded às 19:36-37 UTC 2026-11-01).
-- ROLLBACK: N/A — jobs removidos; re-criar se necessário.
-- FIX (2026-11-01): tornado idempotente para replay em fresh DB.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'vacuum-snapshots-now') THEN
    PERFORM cron.unschedule('vacuum-snapshots-now');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'vacuum-daily-summary-now') THEN
    PERFORM cron.unschedule('vacuum-daily-summary-now');
  END IF;
END;
$$;
