-- mirror: DDL aplicada em produção fora do fluxo de migration (out-of-band)
-- Aplicada em: 2026-11-01 23:20:22 UTC via db-apply-migration.yml por adm01-debug
-- Referência: DRIFT detectado em analise-branches/RELATORIO_BRANCHES.md §5
-- NOTA: SQL idêntico a 20261101220000_cron001_stagger_schedules.sql — reaplicação dos mesmos jobs.
-- cron.alter_job é idempotente; não há impacto negativo em produção.
-- CRON-001: Escalonar schedules de 10 cron jobs com job startup timeout
-- jobid 276 (sm-site-scrape): 14,44 → 16,46
SELECT cron.alter_job(276, schedule => '16,46 * * * *');
-- jobid 224 (asia-enqueue-new-products): 19,49 → 21,51
SELECT cron.alter_job(224, schedule => '21,51 * * * *');
-- jobid 114 (sync-supplier-timestamps-hourly): 55 → 57
SELECT cron.alter_job(114, schedule => '57 * * * *');
-- jobid 243 (hash-product-images): 10,25,40,55 → 11,26,41,56
SELECT cron.alter_job(243, schedule => '11,26,41,56 * * * *');
