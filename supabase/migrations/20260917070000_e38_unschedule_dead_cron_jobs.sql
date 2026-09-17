-- E38 — Remove os 2 cron jobs desligados que não têm caminho de volta útil.
-- Plano: docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md (E38)
-- Ver docs/E38_CRON_JOBS_DESLIGADOS_2026-09-17.md para a investigação completa.
--
-- 1) pipeline-classify-categories (jobid 274): chama
--    public.fn_pipeline_classify_pending_products(integer), que NÃO EXISTE
--    mais no schema (to_regprocedure confirma NULL). Job não tem como
--    voltar a funcionar sem reescrever a função — decisão: remover.
--
-- 2) process-webhook-outbox (jobid 202): chama
--    public.fn_process_webhook_outbox_batch(integer), que ainda existe, mas
--    a tabela que processa (public.webhook_outbox) está com 0 linhas e sem
--    nenhum produtor/consumidor real no código (grep em src/ e
--    supabase/functions/ só encontra o stub de tipo gerado). O padrão de
--    webhook realmente em uso é supabase/functions/webhook-dispatcher
--    (dispatch direto por evento, não fila). Decisão: remover o job (não a
--    tabela — descontinuação completa da fila fica para decisão separada).
--
-- Ambos os jobs já estavam com active=false antes desta migration — remover
-- não muda comportamento em produção hoje, só formaliza a decisão e evita
-- que alguém reative um job morto sem saber que ele não funciona
-- (classify-categories) ou não tem mais propósito (webhook-outbox).
--
-- [REQUER-PO] — não aplicado nesta revisão. Caminho de aplicação: E15
-- (.github/workflows/db-apply-migration.yml), nunca supabase db push.

DO $precondition$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobid = 274 AND jobname = 'pipeline-classify-categories') THEN
    RAISE EXCEPTION 'Precondição falhou: cron.job jobid=274 (pipeline-classify-categories) não existe com esse nome — investigar antes de prosseguir';
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobid = 274 AND active) THEN
    RAISE EXCEPTION 'Precondição falhou: pipeline-classify-categories está active=true — alguém reativou, investigar antes de remover';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobid = 202 AND jobname = 'process-webhook-outbox') THEN
    RAISE EXCEPTION 'Precondição falhou: cron.job jobid=202 (process-webhook-outbox) não existe com esse nome — investigar antes de prosseguir';
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobid = 202 AND active) THEN
    RAISE EXCEPTION 'Precondição falhou: process-webhook-outbox está active=true — alguém reativou, investigar antes de remover';
  END IF;

  IF to_regprocedure('public.fn_pipeline_classify_pending_products(integer)') IS NOT NULL THEN
    RAISE EXCEPTION 'Precondição falhou: fn_pipeline_classify_pending_products(integer) existe agora — premissa da decisão mudou, investigar antes de prosseguir';
  END IF;

  IF (SELECT count(*) FROM public.webhook_outbox) <> 0 THEN
    RAISE EXCEPTION 'Precondição falhou: public.webhook_outbox não está mais vazia — investigar backlog antes de remover o job que a processa';
  END IF;
END;
$precondition$;

SELECT cron.unschedule('pipeline-classify-categories');
SELECT cron.unschedule('process-webhook-outbox');

DO $postcondition$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pipeline-classify-categories') THEN
    RAISE EXCEPTION 'Pós-condição falhou: pipeline-classify-categories ainda existe em cron.job';
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-webhook-outbox') THEN
    RAISE EXCEPTION 'Pós-condição falhou: process-webhook-outbox ainda existe em cron.job';
  END IF;
END;
$postcondition$;

-- Reversão:
-- SELECT cron.schedule('process-webhook-outbox', '* * * * *',
--   'SELECT public.fn_process_webhook_outbox_batch(10);');
-- (fn_process_webhook_outbox_batch ainda existe, então isso volta a funcionar.)
--
-- SELECT cron.schedule('pipeline-classify-categories', '2,12,22,32,42,52 * * * *',
--   $$SELECT public.fn_cron_safe_run(55::bigint, 'SELECT public.fn_pipeline_classify_pending_products(50);', 580000, 'pipeline-classify');$$);
-- (NÃO funcional como está — fn_pipeline_classify_pending_products precisa
-- ser recriada primeiro; registrado aqui só para preservar a definição
-- original do job, não como reversão pronta para uso.)
