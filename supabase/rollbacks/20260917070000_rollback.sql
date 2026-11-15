-- Rollback de 20260917070000_e38_unschedule_dead_cron_jobs.sql
-- Restaura os 2 cron jobs removidos pela E38.
--
-- ATENÇÃO: pipeline-classify-categories NÃO é funcional — a função
-- public.fn_pipeline_classify_pending_products(integer) não existe mais.
-- O schedule é restaurado aqui apenas para preservar a definição original
-- do job. Para que funcione, a função precisaria ser recriada primeiro.

-- GUARD: rollback de migration que AINDA NAO foi aplicada nao pode rodar.
-- Em 2026-11-15, 20260917070000 nao esta em supabase_migrations.schema_migrations
-- (a janela de 17/set tem so 20260917061500 no ledger) e os jobs de cron em
-- producao seguem no estado PRE-migration. Sem esta guarda, rodar o arquivo
-- aplicaria "rollback" sobre um estado que nunca mudou.
DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20260917070000'
  ) THEN
    RAISE EXCEPTION
      'rollback abortado: a migration 20260917070000 nao esta aplicada neste banco; nao ha o que desfazer';
  END IF;
END
$guard$;

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

-- Os jobs 202 e 274 existem hoje em producao com active=false. cron.schedule
-- com jobname existente sobrescreve E REATIVA, entao devolver o schedule sem
-- isto ligaria de volta dois jobs desligados, um deles chamando
-- public.fn_pipeline_classify_pending_products(integer), que nao existe.
SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname = 'process-webhook-outbox'), active := false);
SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname = 'pipeline-classify-categories'), active := false);
