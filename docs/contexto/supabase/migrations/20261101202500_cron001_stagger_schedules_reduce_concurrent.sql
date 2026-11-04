-- CRON-001: Stagger de schedules para reduzir pico de execução concorrente de 7 → ≤5
-- Root cause: cron.max_running_jobs=32 > max_worker_processes=6 (GUC PGC_POSTMASTER — imutável via SQL)
-- Análise: no minuto :00 das horas 0,4,8,12,16,20 coincidiam 7 jobs simultâneos, excedendo o pool
-- Fix: deslocar 3 jobs problemáticos para minutos :01, :03 e :18
-- ROLLBACK:
--   SELECT cron.alter_job(292, schedule := '0 */4 * * *');
--   SELECT cron.alter_job(303, schedule := '0 */6 * * *');
--   SELECT cron.alter_job(241, schedule := '15 * * * *');
SELECT cron.alter_job(292, schedule := '1 */4 * * *');   -- pipeline-health-check-4h: :00 → :01
SELECT cron.alter_job(303, schedule := '3 */6 * * *');   -- anon-catalog-grant-audit-6h: :00 → :03
SELECT cron.alter_job(241, schedule := '18 * * * *');    -- refresh-mv-stock-rupture-alert: :15 → :18
