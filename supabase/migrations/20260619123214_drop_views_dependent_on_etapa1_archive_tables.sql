
-- Dropar views que dependem das tabelas sendo arquivadas na Etapa 1
-- CASCADE garante que views dependentes de views também sejam dropadas
-- Ordem: da mais dependente para a mais independente

DROP VIEW IF EXISTS public.v_supplier_suffix_mappings_complete CASCADE;
DROP VIEW IF EXISTS public.v_supplier_coverage CASCADE;
DROP VIEW IF EXISTS public.v_image_types_complete CASCADE;
DROP VIEW IF EXISTS public.vw_spot_eu_diff_status CASCADE;
DROP VIEW IF EXISTS public.v_media_sync_queue_stats CASCADE;

-- v_cf_referenced_ids também depende de sm_images_staging (etapa 3)
-- mas precisa ser dropada agora pois depende de spot_eu_image_diff_queue e media_sync_queue
DROP VIEW IF EXISTS public.v_cf_referenced_ids CASCADE;

-- Verificar que foram removidas
DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM pg_views 
  WHERE schemaname = 'public'
  AND viewname IN (
    'v_supplier_suffix_mappings_complete','v_supplier_coverage',
    'v_image_types_complete','vw_spot_eu_diff_status',
    'v_media_sync_queue_stats','v_cf_referenced_ids'
  );
  IF v_count > 0 THEN
    RAISE EXCEPTION 'FALHA: % views ainda existem após DROP', v_count;
  END IF;
  RAISE NOTICE 'SUCESSO: todas as 6 views dropadas';
END;
$$;
;
