-- Rollback de 20261108230100: volta à agenda observada em produção em 2026-11-11 (pós-CRON-001).
SELECT cron.alter_job(243, schedule => '11,26,41,56 * * * *');
SELECT cron.alter_job(276, schedule => '16,46 * * * *');
SELECT cron.alter_job(224, schedule => '21,51 * * * *');
SELECT cron.alter_job(114, schedule => '57 * * * *');
