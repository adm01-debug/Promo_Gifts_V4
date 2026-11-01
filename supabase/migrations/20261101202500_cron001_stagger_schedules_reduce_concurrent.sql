-- CRON-001: Stagger de schedules para reduzir pico de execução concorrente de 7 → ≤5
-- Severidade: ALTO | Tipo: PERFORMANCE/INTEGRIDADE
-- Evidência: 418→127 falhas/24h em cron.job_run_details (status 'failed', started+1s=finished)
-- Root cause: cron.max_running_jobs=32 > max_worker_processes=6 (GUC PGC_POSTMASTER — imutável via SQL)
-- Análise: minuto :00 de horas 0,4,8,12,16,20 → 7 jobs simultâneos (pipeline-4h + anon-audit-6h
--          + monitor-connections + process-webhook-outbox + sync-is-stockout + generate-blurhashes
--          + dispatcher-log-sync) excede max_worker_processes=6.
-- Minuto :15 → 6 jobs borderline (pipeline-hourly + refresh-mv-rupture + sm-url-discover + 3 always-on).
-- Fix: deslocar 3 jobs para minutos :01, :03, :18 — reduz pico para ≤5 concorrentes.
-- ROLLBACK:
--   SELECT cron.alter_job(292, schedule := '0 */4 * * *');
--   SELECT cron.alter_job(303, schedule := '0 */6 * * *');
--   SELECT cron.alter_job(241, schedule := '15 * * * *');
SELECT cron.alter_job(292, schedule := '1 */4 * * *');   -- pipeline-health-check-4h: :00 → :01
SELECT cron.alter_job(303, schedule := '3 */6 * * *');   -- anon-catalog-grant-audit-6h: :00 → :03
SELECT cron.alter_job(241, schedule := '18 * * * *');    -- refresh-mv-stock-rupture-alert: :15 → :18
