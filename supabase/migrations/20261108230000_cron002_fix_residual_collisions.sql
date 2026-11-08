-- CRON-002: Correção de colisões residuais pós-CRON-001 (startup timeouts persistentes)
--
-- Diagnóstico: CRON-001 (20261101220000_cron001_stagger_schedules.sql) moveu 4 jobs
-- para novos minutos que introduziram colisões com jobs não mapeados na análise original:
--
--   jobid 243 (hash-product-images)       → 11,26,41,56: colide IDENTICAMENTE com jobid 213 (sm-category-enqueue)
--   jobid 276 (sm-site-scrape)            → 16,46: colide com 205+306 (1,16,31,46) e 230 (cron job único em :46)
--   jobid 224 (asia-enqueue-new-products) → 21,51: colide com 207+210 (6,21,36,51) e 232 (único em :51)
--   jobid 114 (sync-supplier-timestamps-hourly) → 57: colide com 206+214 (12,27,42,57)
--
-- Evidência de startup timeouts pós-CRON-001 (cron.job_run_details, start_time >= 2026-11-01):
--   jobid 243: 43 falhas, jobid 276: 21 falhas, jobid 224: 16 falhas, jobid 114: 4 falhas
--
-- Metodologia CRON-002: mapeamento de todos os 180 jobs ativos por minuto (:00-:59)
-- para identificar slots com ≤2 jobs existentes e zero sobreposição entre os 4 targets.
--
-- Novos schedules (máx 3 jobs simultâneos em qualquer slot; targets não se sobrepõem entre si):
--   jobid 243: 11,26,41,56 → 10,25,40,55  [:10→3jobs, :25→3jobs, :40→2jobs, :55→2jobs]
--   jobid 276: 16,46       → 20,50         [:20→3jobs, :50→3jobs]
--   jobid 224: 21,51       → 24,54         [:24→3jobs, :54→3jobs]
--   jobid 114: 57          → 30            [:30→2jobs]
--
-- ROLLBACK (reverte para estado CRON-001):
--   SELECT cron.alter_job(243, schedule => '11,26,41,56 * * * *');
--   SELECT cron.alter_job(276, schedule => '16,46 * * * *');
--   SELECT cron.alter_job(224, schedule => '21,51 * * * *');
--   SELECT cron.alter_job(114, schedule => '57 * * * *');

-- jobid 243 (hash-product-images): colisão com jobid 213 (sm-category-enqueue, idêntico 11,26,41,56) → move para 10,25,40,55
SELECT cron.alter_job(243, schedule => '10,25,40,55 * * * *');

-- jobid 276 (sm-site-scrape): colisão com 205+306 (1,16,31,46) e 230 (:46) → move para 20,50
SELECT cron.alter_job(276, schedule => '20,50 * * * *');

-- jobid 224 (asia-enqueue-new-products): colisão com 207+210 (6,21,36,51) e 232 (:51) → move para 24,54
SELECT cron.alter_job(224, schedule => '24,54 * * * *');

-- jobid 114 (sync-supplier-timestamps-hourly): colisão com 206+214 (12,27,42,57) → move para 30
SELECT cron.alter_job(114, schedule => '30 * * * *');
