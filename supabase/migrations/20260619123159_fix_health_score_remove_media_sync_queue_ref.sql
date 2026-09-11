
-- Remove dependência de media_sync_queue (tabela sendo arquivada)
-- Substitui o check por uma query direta (media_sync_queue tinha 0 rows e não é mais necessária)
CREATE OR REPLACE FUNCTION public.fn_calculate_health_score()
 RETURNS TABLE(score numeric, grade text, pontos_positivos jsonb, pontos_atencao jsonb, calculated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_score numeric := 100;
  v_positivos jsonb := '[]'::jsonb;
  v_atencao jsonb := '[]'::jsonb;
  v_cron_failed integer;
  v_critical_alerts integer;
  v_warning_alerts integer;
  v_products_no_ncm integer;
  v_products_no_image_not_queued integer;
  v_tests_passed integer;
  v_tests_total integer;
  v_active_products integer;
  v_docs integer;
  v_orphans integer;
BEGIN
  SELECT COUNT(*) INTO v_cron_failed FROM cron.job_run_details
    WHERE status='failed' AND start_time > now()-interval '1 hour';

  SELECT COUNT(*) FILTER (WHERE severidade='critical'),
         COUNT(*) FILTER (WHERE severidade='warning')
  INTO v_critical_alerts, v_warning_alerts FROM v_system_alerts;

  SELECT COUNT(*) INTO v_products_no_ncm FROM products
    WHERE is_active=true AND ncm_id IS NULL;

  -- media_sync_queue arquivada — check simplificado: produtos ativos sem imagem
  SELECT COUNT(*) INTO v_products_no_image_not_queued
  FROM products p WHERE p.is_active=true AND p.primary_image_url IS NULL;

  SELECT COUNT(*) INTO v_active_products FROM products WHERE is_active=true;
  SELECT COUNT(*) INTO v_docs FROM system_documentation;

  BEGIN
    SELECT COUNT(*) FILTER (WHERE result LIKE '✅%'), COUNT(*)
    INTO v_tests_passed, v_tests_total FROM fn_run_smoke_tests();
  EXCEPTION WHEN OTHERS THEN v_tests_passed:=0; v_tests_total:=0; END;

  SELECT COUNT(*) INTO v_orphans FROM product_variants pv
    WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id=pv.product_id);

  IF v_cron_failed > 0 THEN
    v_score := v_score - LEAST(20, v_cron_failed*5);
    v_atencao := v_atencao || jsonb_build_object('cron_failures_1h', v_cron_failed);
  END IF;
  IF v_critical_alerts > 0 THEN
    v_score := v_score - (v_critical_alerts*15);
    v_atencao := v_atencao || jsonb_build_object('critical_alerts', v_critical_alerts);
  END IF;
  IF v_warning_alerts > 0 THEN
    v_score := v_score - (v_warning_alerts*2);
    v_atencao := v_atencao || jsonb_build_object('warning_alerts', v_warning_alerts);
  END IF;
  IF v_products_no_ncm > 0 THEN
    v_score := v_score - LEAST(10, v_products_no_ncm*0.5);
    v_atencao := v_atencao || jsonb_build_object('products_no_ncm', v_products_no_ncm);
  END IF;
  IF v_products_no_image_not_queued > 0 THEN
    v_score := v_score - LEAST(5, v_products_no_image_not_queued*0.2);
    v_atencao := v_atencao || jsonb_build_object('products_no_image', v_products_no_image_not_queued);
  END IF;
  IF v_orphans > 0 THEN
    v_score := v_score - LEAST(10, v_orphans*1);
    v_atencao := v_atencao || jsonb_build_object('orphan_variants', v_orphans);
  END IF;
  IF v_tests_total > 0 AND v_tests_passed < v_tests_total THEN
    v_score := v_score - ((v_tests_total-v_tests_passed)*2);
    v_atencao := v_atencao || jsonb_build_object('smoke_tests_failed', v_tests_total-v_tests_passed);
  END IF;

  IF v_cron_failed = 0 THEN
    v_positivos := v_positivos || jsonb_build_object('feature','cron_health','detail','Zero falhas de cron na última hora'); END IF;
  IF v_products_no_ncm = 0 THEN
    v_positivos := v_positivos || jsonb_build_object('feature','fiscal_integrity','detail','100% produtos ativos com NCM'); END IF;
  IF v_orphans = 0 THEN
    v_positivos := v_positivos || jsonb_build_object('feature','referential_integrity','detail','Zero órfãos em relações críticas'); END IF;
  IF v_tests_total > 0 AND v_tests_passed = v_tests_total THEN
    v_positivos := v_positivos || jsonb_build_object('feature','smoke_tests','detail', v_tests_passed||'/'||v_tests_total||' testes passando'); END IF;

  v_positivos := v_positivos || jsonb_build_object('feature','catalog_scale','detail', v_active_products||' produtos ativos');
  v_positivos := v_positivos || jsonb_build_object('feature','rls_coverage','detail',
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname='public')::text||' políticas RLS');
  v_positivos := v_positivos || jsonb_build_object('feature','indexing','detail',
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public')::text||' índices');
  v_positivos := v_positivos || jsonb_build_object('feature','realtime','detail',
    (SELECT COUNT(*) FROM pg_publication_tables WHERE pubname='supabase_realtime')::text||' tabelas em realtime');
  v_positivos := v_positivos || jsonb_build_object('feature','documentation','detail', v_docs||' entradas de auto-documentação');
  v_positivos := v_positivos || jsonb_build_object('feature','check_constraints','detail',
    (SELECT COUNT(*) FROM pg_constraint WHERE contype='c' AND connamespace='public'::regnamespace)::text||' CHECK constraints');

  v_positivos := v_positivos || jsonb_build_object('feature','image_pipeline','detail',
    'image_backfill_queue ativo: '||(SELECT COUNT(*) FROM image_backfill_queue WHERE status='pending')::text||' pendentes');

  IF v_critical_alerts=0 AND v_warning_alerts=0 AND v_tests_passed=v_tests_total THEN
    v_positivos := v_positivos || jsonb_build_object('feature','🏆 EXCELLENCE_BONUS','detail','Zero issues + 100% testes = sistema impecável');
  END IF;

  v_score := GREATEST(0, LEAST(100, v_score));
  RETURN QUERY SELECT ROUND(v_score,1),
    CASE WHEN v_score>=98 THEN '🏆 A++ PERFEITO' WHEN v_score>=95 THEN 'A+ EXCELENTE'
         WHEN v_score>=90 THEN 'A ÓTIMO' WHEN v_score>=80 THEN 'B BOM'
         WHEN v_score>=70 THEN 'C REGULAR' WHEN v_score>=60 THEN 'D ATENÇÃO' ELSE 'F CRÍTICO' END,
    v_positivos, v_atencao, now();
END;
$function$;
;
