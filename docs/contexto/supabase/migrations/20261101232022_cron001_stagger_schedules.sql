-- CRON-001: Escalonar schedules de 10 cron jobs com job startup timeout
-- jobid 276 (sm-site-scrape): 14,44 → 16,46
SELECT cron.alter_job(276, schedule => '16,46 * * * *');
-- jobid 224 (asia-enqueue-new-products): 19,49 → 21,51
SELECT cron.alter_job(224, schedule => '21,51 * * * *');
-- jobid 114 (sync-supplier-timestamps-hourly): 55 → 57
SELECT cron.alter_job(114, schedule => '57 * * * *');
-- jobid 243 (hash-product-images): 10,25,40,55 → 11,26,41,56
SELECT cron.alter_job(243, schedule => '11,26,41,56 * * * *');
