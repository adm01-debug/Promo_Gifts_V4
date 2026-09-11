
-- MELHORIA 10: Job suplementar de ANALYZE para tabelas >10MB não cobertas pelo job 53
-- Roda sábados às 3h UTC (1h após o job 53)
DO $$ 
DECLARE v_jobid bigint;
BEGIN
  -- Remove se já existe (idempotente)
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'analyze-weekly-supplement';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END $$;

-- Nota: cada linha é um ANALYZE separado (ANALYZE pode rodar em transaction block, ao contrário de VACUUM)
SELECT cron.schedule(
  'analyze-weekly-supplement',
  '0 3 * * 6',
  $cmd$
    ANALYZE public.stock_daily_summary;
    ANALYZE public.mv_product_images_audit;
    ANALYZE public.image_backfill_queue;
    ANALYZE public.variant_supplier_sources;
    ANALYZE public.produtos_padronizacao;
    ANALYZE public.product_properties;
    ANALYZE public.xbz_gallery_staging;
    ANALYZE public.xbz_upload_mapping;
    ANALYZE public.supplier_customization_options_raw;
    ANALYZE public.product_tags;
  $cmd$
) AS jobid;
;
