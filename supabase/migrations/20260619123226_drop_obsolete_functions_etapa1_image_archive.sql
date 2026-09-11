
-- Dropar funções exclusivamente ligadas aos pipelines sendo arquivados
-- Todas com 0 chamadas históricas e não usadas como trigger em nenhuma tabela ativa

-- Pipeline CF Audit (arquivando _cf_images_audit)
DROP FUNCTION IF EXISTS public.fn_cf_audit_ingest CASCADE;

-- Pipeline SPOT EU Diff (arquivando spot_eu_image_diff_queue)
DROP FUNCTION IF EXISTS public.fn_spot_eu_diff_mark_imported CASCADE;
DROP FUNCTION IF EXISTS public.fn_spot_eu_diff_upsert_batch CASCADE;

-- Classificação por sufixo (arquivando supplier_image_suffix_mappings/patterns)
DROP FUNCTION IF EXISTS public.fn_xbz_classify_image_type CASCADE;
DROP FUNCTION IF EXISTS public.get_image_type_by_suffix CASCADE;
DROP FUNCTION IF EXISTS public.get_internal_image_type CASCADE;
DROP FUNCTION IF EXISTS public.insert_product_image_with_type CASCADE;
DROP FUNCTION IF EXISTS public.check_media_coverage CASCADE;
DROP FUNCTION IF EXISTS public.debug_image_type CASCADE;

-- Verificação pós-drop
DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
  AND p.proname IN (
    'fn_cf_audit_ingest','fn_spot_eu_diff_mark_imported','fn_spot_eu_diff_upsert_batch',
    'fn_xbz_classify_image_type','get_image_type_by_suffix','get_internal_image_type',
    'insert_product_image_with_type','check_media_coverage','debug_image_type'
  );
  IF v_count > 0 THEN
    RAISE EXCEPTION 'FALHA: % funções ainda existem', v_count;
  END IF;
  RAISE NOTICE 'SUCESSO: todas as % funções obsoletas removidas', 9 - v_count;
END;
$$;
;
