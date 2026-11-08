-- mirror: DDL aplicada em produção fora do fluxo de migration (out-of-band)
-- Aplicada em: 2026-11-01 22:39:08 UTC via db-apply-migration.yml por adm01-debug
-- Referência: DRIFT detectado em analise-branches/RELATORIO_BRANCHES.md §5
-- CRON-001: Stagger de schedules para reduzir pico de execução concorrente de 7 → ≤5
-- Fix: deslocar 3 jobs para minutos :01, :03, :18 — reduz pico para ≤5 concorrentes.
SELECT cron.alter_job(292, schedule := '1 */4 * * *');   -- pipeline-health-check-4h: :00 → :01
SELECT cron.alter_job(303, schedule := '3 */6 * * *');   -- anon-catalog-grant-audit-6h: :00 → :03
SELECT cron.alter_job(241, schedule := '18 * * * *');    -- refresh-mv-stock-rupture-alert: :15 → :18
