
-- Etapa 3.2a: DROP da view de status SM pipeline
DROP VIEW IF EXISTS public.vw_sm_image_pipeline_status CASCADE;

-- Etapa 3.2b: DROP das 9 funções do pipeline SM (todas com 0 chamadas, não são triggers)
DROP FUNCTION IF EXISTS public.fn_sm_dispatch_image_batch CASCADE;
DROP FUNCTION IF EXISTS public.fn_sm_enqueue_fotos_cdn CASCADE;
DROP FUNCTION IF EXISTS public.fn_sm_enqueue_images CASCADE;
DROP FUNCTION IF EXISTS public.fn_sm_harvest_image_batch CASCADE;
DROP FUNCTION IF EXISTS public.fn_sm_mark_batch_uploaded CASCADE;
DROP FUNCTION IF EXISTS public.fn_sm_promote_images_to_gold CASCADE;
DROP FUNCTION IF EXISTS public.fn_sm_recover_stale CASCADE;
DROP FUNCTION IF EXISTS public.fn_sm_retry_errors CASCADE;
DROP FUNCTION IF EXISTS public.fn_sm_run_image_cycle CASCADE;

-- Etapa 3.2c: Mover sm_images_staging para archive
-- Trigger trg_sm_images_staging_updated_at fica com a tabela (é interno à tabela)
ALTER TABLE public.sm_images_staging SET SCHEMA archive;

-- VALIDAÇÃO COMPLETA ETAPA 3
DO $$
DECLARE
  v_cron_active boolean;
  v_in_public int;
  v_in_archive int;
  v_view_exists int;
  v_funcs_exist int;
BEGIN
  SELECT active INTO v_cron_active FROM cron.job WHERE jobname = 'sm-image-uploader';
  
  SELECT COUNT(*) INTO v_in_public FROM pg_tables 
  WHERE schemaname='public' AND tablename='sm_images_staging';
  
  SELECT COUNT(*) INTO v_in_archive FROM pg_tables 
  WHERE schemaname='archive' AND tablename='sm_images_staging';
  
  SELECT COUNT(*) INTO v_view_exists FROM pg_views 
  WHERE schemaname='public' AND viewname='vw_sm_image_pipeline_status';
  
  SELECT COUNT(*) INTO v_funcs_exist FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname='public' AND p.proname IN (
    'fn_sm_dispatch_image_batch','fn_sm_enqueue_fotos_cdn','fn_sm_enqueue_images',
    'fn_sm_harvest_image_batch','fn_sm_mark_batch_uploaded','fn_sm_promote_images_to_gold',
    'fn_sm_recover_stale','fn_sm_retry_errors','fn_sm_run_image_cycle'
  );
  
  IF v_cron_active THEN RAISE EXCEPTION 'FALHA: cron sm-image-uploader ainda ativo'; END IF;
  IF v_in_public > 0 THEN RAISE EXCEPTION 'FALHA: sm_images_staging ainda no public'; END IF;
  IF v_in_archive = 0 THEN RAISE EXCEPTION 'FALHA: sm_images_staging não chegou ao archive'; END IF;
  IF v_view_exists > 0 THEN RAISE EXCEPTION 'FALHA: view vw_sm_image_pipeline_status ainda existe'; END IF;
  IF v_funcs_exist > 0 THEN RAISE EXCEPTION 'FALHA: % funções fn_sm_* ainda existem', v_funcs_exist; END IF;
  
  RAISE NOTICE 'SUCESSO: sm_images_staging (4705 rows, 9MB) → archive | cron OFF | 9 funções dropadas | view dropada';
END;
$$;
;
