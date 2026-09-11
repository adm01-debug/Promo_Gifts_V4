
-- Etapa 2.1a: DROP das views que dependem das tabelas de Etapa 2
DROP VIEW IF EXISTS public.v_image_validation_recent CASCADE;
DROP VIEW IF EXISTS public.v_images_below_requirements CASCADE;

-- Etapa 2.1b: DROP dos triggers de validação em product_images
-- (escrevem em image_validation_log que está sendo arquivada)
-- DROP TRIGGER é mais seguro que DISABLE: evita erro futuro se alguém re-habilitar
DROP TRIGGER IF EXISTS trg_validate_image_on_insert ON public.product_images;
DROP TRIGGER IF EXISTS trg_validate_image_on_update ON public.product_images;

-- Etapa 2.1c: DROP da função trigger (só usada por esses 2 triggers)
-- Verificado: exclusiva de product_images
DROP FUNCTION IF EXISTS public.fn_validate_image_on_change CASCADE;

-- Etapa 2.1d: DROP da função validate_image_requirements (usa supplier_image_requirements)
DROP FUNCTION IF EXISTS public.validate_image_requirements CASCADE;
DROP FUNCTION IF EXISTS public.get_validation_summary CASCADE;

-- VALIDAÇÃO
DO $$
DECLARE
  v_triggers int;
  v_views int;
BEGIN
  SELECT COUNT(*) INTO v_triggers FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  WHERE c.relname = 'product_images'
    AND NOT t.tgisinternal
    AND t.tgname IN ('trg_validate_image_on_insert','trg_validate_image_on_update');
  
  SELECT COUNT(*) INTO v_views FROM pg_views
  WHERE schemaname = 'public'
  AND viewname IN ('v_image_validation_recent','v_images_below_requirements');
  
  IF v_triggers > 0 THEN
    RAISE EXCEPTION 'FALHA: % triggers de validação ainda existem', v_triggers;
  END IF;
  IF v_views > 0 THEN
    RAISE EXCEPTION 'FALHA: % views ainda existem', v_views;
  END IF;
  RAISE NOTICE 'SUCESSO: triggers e views da etapa 2 removidos';
END;
$$;
;
