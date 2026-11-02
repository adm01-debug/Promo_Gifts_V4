-- CRON-001: Escalonar schedules de 10 cron jobs com "job startup timeout"
-- Severidade: ALTO | Tipo: BUG
-- Evidência: cron.job_run_details WHERE status = 'failed' AND return_message LIKE '%job startup timeout%'
--   → 10 jobs falhando: jobids 114, 209, 216, 217, 219, 221, 224, 243, 264, 276
-- Causa raiz: múltiplos jobs tentando iniciar no mesmo minuto excede capacidade de conexão pg_cron
-- Análise de colisões antes do fix:
--   :04 → [209, 217], :14 → [216, 217, 276], :19 → [209, 224, 264]
--   :25 → [219, 243], :34 → [209, 217], :44 → [216, 217, 276]
--   :49 → [209, 224], :55 → [114, 219, 243], :59 → [216, 264]
-- Fix: deslocar 4 jobs (114, 224, 243, 276) por 2 minutos para reduzir colisões máx de 3→2
-- Após fix: nenhum minuto tem mais de 2 jobs simultâneos
-- ROLLBACK: SELECT cron.alter_job(jobid, schedule => 'schedule_original') para cada job abaixo
--
-- Colisões após fix:
--   :04 → [209, 217], :14 → [216, 217], :16 → [276], :19 → [209, 264]
--   :21 → [224], :26 → [243], :34 → [209, 217], :44 → [216, 217]
--   :46 → [276], :49 → [209], :51 → [224], :56 → [243]
--   :57 → [114], :59 → [216, 264]
-- Máximo simultâneo: 2 (reduzido de 3)

-- jobid 276 (sm-site-scrape): 14,44 → 16,46 (evita colisão com 216+217 em :14/:44)
SELECT cron.alter_job(276, schedule => '16,46 * * * *');

-- jobid 224 (asia-enqueue-new-products): 19,49 → 21,51 (evita colisão com 209+264 em :19/:49)
SELECT cron.alter_job(224, schedule => '21,51 * * * *');

-- jobid 114 (sync-supplier-timestamps-hourly): 55 → 57 (evita colisão com 219+243 em :55)
SELECT cron.alter_job(114, schedule => '57 * * * *');

-- jobid 243 (hash-product-images): 10,25,40,55 → 11,26,41,56 (evita :25 com 219, :55 com 114+219)
SELECT cron.alter_job(243, schedule => '11,26,41,56 * * * *');
