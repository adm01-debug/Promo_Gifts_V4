-- ITEM 3 — Categorias: integra a classificação (fill-only) como passo agendado do pipeline.
-- fn_backfill_product_categories só preenche category_id NULL (nunca sobrescreve) via
-- fn_master_classify_product (classificação por nome). Garante que produtos novos do
-- pipeline Bronze→Silver→Gold recebam categoria automaticamente, sem regressão.
DO $$ BEGIN
  PERFORM cron.unschedule('pipeline-classify-categories');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'pipeline-classify-categories',
  '*/10 * * * *',
  $cron$ SELECT public.fn_backfill_product_categories(300, false); $cron$
);;
