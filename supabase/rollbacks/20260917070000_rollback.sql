-- Rollback de 20260917070000_e38_unschedule_dead_cron_jobs.sql
-- Restaura os 2 cron jobs removidos pela E38.
--
-- ATENÇÃO: pipeline-classify-categories NÃO é funcional — a função
-- public.fn_pipeline_classify_pending_products(integer) não existe mais.
-- O schedule é restaurado aqui apenas para preservar a definição original
-- do job. Para que funcione, a função precisaria ser recriada primeiro.

SELECT cron.schedule(
  'process-webhook-outbox',
  '* * * * *',
  'SELECT public.fn_process_webhook_outbox_batch(10);'
);

-- NÃO FUNCIONAL como está — fn_pipeline_classify_pending_products não existe:
SELECT cron.schedule(
  'pipeline-classify-categories',
  '2,12,22,32,42,52 * * * *',
  $$SELECT public.fn_cron_safe_run(55::bigint, 'SELECT public.fn_pipeline_classify_pending_products(50);', 580000, 'pipeline-classify');$$
);
