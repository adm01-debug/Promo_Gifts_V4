
-- MELHORIA 5: Extender fn_run_smoke_tests com 5 novos testes do pipeline de confiabilidade
-- Estratégia: adicionar bloco novo no fim da função (sem tocar nos 23 testes existentes)

CREATE OR REPLACE FUNCTION public.fn_run_smoke_tests()
RETURNS TABLE(test_name text, test_category text, result text, details text, duration_ms numeric)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE v_start timestamptz; v_count int; v_payload jsonb;
BEGIN
  -- ═══ TESTES ORIGINAIS (sem alteração) ═══

  v_start := clock_timestamp();
  SELECT COUNT(*) INTO v_count FROM information_schema.tables
  WHERE table_schema='public' AND table_name IN (
    'products','product_variants','variant_supplier_sources',
    'organizations','suppliers','categories','ncm_codes','profiles');
  RETURN QUERY SELECT 'critical_tables_exist'::text,'structure'::text,
    CASE WHEN v_count=8 THEN '✅ PASS' ELSE '❌ FAIL' END::text,
    ('Esperado: 8, Encontrado: '||v_count::text)::text,
    (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;

  v_start := clock_timestamp();
  SELECT COUNT(*) INTO v_count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity;
  RETURN QUERY SELECT 'rls_coverage'::text,'security'::text,
    CASE WHEN v_count=0 THEN '✅ PASS' ELSE '❌ FAIL' END::text,
    ('Tabelas sem RLS: '||v_count::text)::text,
    (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;

  v_start := clock_timestamp();
  SELECT COUNT(*) INTO v_count FROM cron.job_run_details
  WHERE start_time>now()-interval '1 hour' AND status='failed';
  RETURN QUERY SELECT 'cron_health_1h'::text,'operations'::text,
    CASE WHEN v_count=0 THEN '✅ PASS' ELSE '❌ FAIL' END::text,
    ('Falhas na última hora: '||v_count::text)::text,
    (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;

  v_start := clock_timestamp();
  SELECT COUNT(*) INTO v_count FROM product_variants pv
  WHERE NOT EXISTS(SELECT 1 FROM products p WHERE p.id=pv.product_id);
  RETURN QUERY SELECT 'no_orphan_variants'::text,'integrity'::text,
    CASE WHEN v_count=0 THEN '✅ PASS' ELSE '❌ FAIL' END::text,
    ('Variantes órfãs: '||v_count::text)::text,
    (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;

  v_start := clock_timestamp();
  SELECT COUNT(*) INTO v_count FROM products
  WHERE is_active AND(name IS NULL OR sku IS NULL OR length(trim(name))=0);
  RETURN QUERY SELECT 'products_have_name_and_sku'::text,'data_quality'::text,
    CASE WHEN v_count=0 THEN '✅ PASS' ELSE '❌ FAIL' END::text,
    ('Produtos ativos sem name/sku: '||v_count::text)::text,
    (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;

  v_start := clock_timestamp();
  SELECT COUNT(*) INTO v_count FROM products WHERE is_active AND(ncm_code IS NULL OR ncm_id IS NULL);
  RETURN QUERY SELECT 'fiscal_ncm_coverage'::text,'compliance'::text,
    CASE WHEN v_count=0 THEN '✅ PASS' WHEN v_count<=60 THEN '⚠️ WARN' ELSE '❌ FAIL' END::text,
    ('Produtos ativos sem NCM: '||v_count::text||CASE WHEN v_count>0 AND v_count<=60 THEN ' (XBZ sem NCM na API)' ELSE '' END)::text,
    (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;

  v_start := clock_timestamp();
  SELECT COUNT(*) INTO v_count FROM product_variants pv WHERE pv.is_active AND NOT EXISTS(
    SELECT 1 FROM variant_supplier_sources vss WHERE vss.variant_id=pv.id AND vss.is_preferred AND vss.is_active);
  RETURN QUERY SELECT 'variants_have_preferred_supplier'::text,'data_quality'::text,
    CASE WHEN v_count=0 THEN '✅ PASS' ELSE '⚠️ WARN' END::text,
    ('Variantes sem preferred: '||v_count::text)::text,
    (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;

  v_start := clock_timestamp();
  SELECT COUNT(*) INTO v_count FROM pg_indexes WHERE schemaname='public' AND indexname IN(
    'uq_seo_redirects_source_active','idx_products_active_name_sort',
    'products_pkey','product_variants_pkey','products_sku_key');
  RETURN QUERY SELECT 'critical_indexes_exist'::text,'performance'::text,
    CASE WHEN v_count=5 THEN '✅ PASS' ELSE '❌ FAIL' END::text,
    ('Encontrados: '||v_count::text||'/5')::text,
    (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;

  v_start := clock_timestamp();
  SELECT COUNT(*) INTO v_count FROM pg_publication_tables WHERE pubname='supabase_realtime';
  RETURN QUERY SELECT 'realtime_configured'::text,'features'::text,
    CASE WHEN v_count>=5 THEN '✅ PASS' ELSE '⚠️ WARN' END::text,
    ('Tabelas publicadas: '||v_count::text)::text,
    (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;

  v_start := clock_timestamp();
  SELECT COUNT(*) INTO v_count FROM pg_extension WHERE extname IN('pg_cron','pg_net','pg_stat_statements','pgcrypto');
  RETURN QUERY SELECT 'essential_extensions'::text,'infrastructure'::text,
    CASE WHEN v_count=4 THEN '✅ PASS' ELSE '❌ FAIL' END::text,
    ('Extensões: '||v_count::text||'/4')::text,
    (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;

  v_start := clock_timestamp();
  SELECT COUNT(*) INTO v_count FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname IN(
    'fn_calculate_health_score','fn_run_smoke_tests','fn_capacity_forecast',
    'fn_deploy_readiness_check','fn_is_admin_user','fn_sync_product_stock_cache');
  RETURN QUERY SELECT 'health_functions_exist'::text,'monitoring'::text,
    CASE WHEN v_count>=6 THEN '✅ PASS' ELSE '❌ FAIL' END::text,
    ('Funções: '||v_count::text||'/6')::text,
    (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;

  v_start := clock_timestamp();
  SELECT COUNT(*) INTO v_count FROM auth.users;
  RETURN QUERY SELECT 'auth_schema_accessible'::text,'security'::text,
    '✅ PASS'::text,('auth.users: '||v_count::text)::text,
    (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;

  v_start := clock_timestamp();
  SELECT COUNT(*) INTO v_count FROM products WHERE stock_quantity<0;
  RETURN QUERY SELECT 'stock_cache_positive'::text,'data_quality'::text,
    CASE WHEN v_count=0 THEN '✅ PASS' ELSE '❌ FAIL' END::text,
    ('Stock negativo: '||v_count::text)::text,
    (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;

  v_start := clock_timestamp();
  BEGIN
    EXECUTE 'SET LOCAL role anon';
    EXECUTE 'SELECT COUNT(*) FROM profiles' INTO v_count;
    EXECUTE 'RESET role';
    RETURN QUERY SELECT 'rls_profiles_no_recursion'::text,'security'::text,
      '✅ PASS'::text,('anon sees '||v_count::text)::text,
      (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET role';
    RETURN QUERY SELECT 'rls_profiles_no_recursion'::text,'security'::text,
      '❌ FAIL'::text,SQLERRM::text,
      (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;
  END;

  -- ═══ NOVOS: MÓDULO ANÁLISE DE TENDÊNCIAS ═══

  v_start := clock_timestamp();
  SELECT COUNT(*) INTO v_count FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname IN(
    'fn_generate_trends_insights','fn_log_search_analytics',
    'get_trending_products','search_suggestions',
    'fn_get_conversion_funnel','fn_get_repressed_demand');
  RETURN QUERY SELECT 'trends_functions_exist'::text,'trends'::text,
    CASE WHEN v_count=6 THEN '✅ PASS' ELSE '❌ FAIL' END::text,
    ('Funções de tendências: '||v_count::text||'/6')::text,
    (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;

  v_start := clock_timestamp();
  BEGIN
    SELECT fn_generate_trends_insights(NULL,30) INTO v_payload;
    v_count := CASE WHEN v_payload IS NOT NULL
      AND v_payload?'totals' AND v_payload?'top_products'
      AND v_payload?'repressed_demand'
      AND v_payload->'totals'?'views_growth_pct' THEN 1 ELSE 0 END;
    RETURN QUERY SELECT 'trends_insights_payload_valid'::text,'trends'::text,
      CASE WHEN v_count=1 THEN '✅ PASS' ELSE '❌ FAIL' END::text,
      ('views='||(v_payload->'totals'->>'views')||' · searches='||(v_payload->'totals'->>'searches'))::text,
      (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'trends_insights_payload_valid'::text,'trends'::text,
      '❌ FAIL'::text,SQLERRM::text,(EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;
  END;

  v_start := clock_timestamp();
  SELECT COUNT(*) INTO v_count FROM search_analytics WHERE results_count>2000;
  RETURN QUERY SELECT 'trends_no_suspicious_results_count'::text,'trends'::text,
    CASE WHEN v_count=0 THEN '✅ PASS' ELSE '❌ FAIL' END::text,
    ('results_count suspeitos (>2000): '||v_count::text)::text,
    (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;

  v_start := clock_timestamp();
  BEGIN
    SELECT fn_generate_trends_insights(NULL,30) INTO v_payload;
    v_count := CASE
      WHEN jsonb_array_length(v_payload->'top_products')>=2
       AND (v_payload->'top_products'->0->>'view_count')::bigint
           >=(v_payload->'top_products'->1->>'view_count')::bigint THEN 1
      WHEN jsonb_array_length(v_payload->'top_products')<=1 THEN 1
      ELSE 0 END;
    RETURN QUERY SELECT 'trends_top_products_numeric_sort'::text,'trends'::text,
      CASE WHEN v_count=1 THEN '✅ PASS' ELSE '❌ FAIL' END::text,
      ('1º='||COALESCE(v_payload->'top_products'->0->>'view_count','n/a')||
       ' · 2º='||COALESCE(v_payload->'top_products'->1->>'view_count','n/a'))::text,
      (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'trends_top_products_numeric_sort'::text,'trends'::text,
      '❌ FAIL'::text,SQLERRM::text,(EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;
  END;

  v_start := clock_timestamp();
  SELECT COUNT(*) INTO v_count FROM pg_indexes WHERE schemaname='public' AND indexname IN(
    'idx_product_views_seller_created','idx_product_views_pid_created',
    'idx_search_analytics_term_date','idx_search_analytics_created_at',
    'ux_dashboard_insights_cache_user_fn_key');
  RETURN QUERY SELECT 'trends_performance_indexes'::text,'trends'::text,
    CASE WHEN v_count=5 THEN '✅ PASS' ELSE '⚠️ WARN' END::text,
    ('Índices de trends: '||v_count::text||'/5')::text,
    (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;

  v_start := clock_timestamp();
  SELECT COUNT(*) INTO v_count FROM pg_policies
  WHERE tablename IN('product_views','search_analytics')
    AND cmd='INSERT'
    AND roles::text[] && ARRAY['anon'];
  RETURN QUERY SELECT 'trends_anon_tracking_enabled'::text,'trends'::text,
    CASE WHEN v_count=2 THEN '✅ PASS' ELSE '❌ FAIL' END::text,
    ('Políticas anon INSERT: '||v_count::text||'/2')::text,
    (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;

  v_start := clock_timestamp();
  BEGIN
    SELECT fn_get_conversion_funnel(NULL,30) INTO v_payload;
    v_count := CASE WHEN v_payload?'funnel'
      AND jsonb_array_length(v_payload->'funnel')=4 THEN 1 ELSE 0 END;
    RETURN QUERY SELECT 'trends_funnel_valid'::text,'trends'::text,
      CASE WHEN v_count=1 THEN '✅ PASS' ELSE '❌ FAIL' END::text,
      ('Etapas: '||COALESCE(jsonb_array_length(v_payload->'funnel')::text,'0'))::text,
      (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'trends_funnel_valid'::text,'trends'::text,
      '❌ FAIL'::text,SQLERRM::text,(EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;
  END;

  v_start := clock_timestamp();
  SELECT COUNT(*) INTO v_count FROM pg_indexes
  WHERE tablename='dashboard_insights_cache'
    AND indexdef LIKE '%user_id, function_name, cache_key%';
  RETURN QUERY SELECT 'trends_cache_single_unique_index'::text,'trends'::text,
    CASE WHEN v_count=1 THEN '✅ PASS' WHEN v_count>1 THEN '❌ FAIL' ELSE '⚠️ WARN' END::text,
    ('Índices únicos em dashboard_insights_cache: '||v_count::text||' (esperado: 1)')::text,
    (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;

  v_start := clock_timestamp();
  SELECT COUNT(*) INTO v_count FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='fn_log_search_analytics'
    AND position('pg_try_advisory_xact_lock' IN pg_get_functiondef(p.oid))>0;
  RETURN QUERY SELECT 'trends_debounce_race_fix'::text,'trends'::text,
    CASE WHEN v_count=1 THEN '✅ PASS' ELSE '❌ FAIL' END::text,
    ('Advisory lock no debounce: '||CASE WHEN v_count=1 THEN 'ativo' ELSE 'ausente' END)::text,
    (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;

  -- ═══════════════════════════════════════════════════════════════════
  -- NOVOS: MÓDULO SUPPLIER RELIABILITY PIPELINE (5 testes)
  -- ═══════════════════════════════════════════════════════════════════

  -- SRT-01: Objetos críticos do pipeline existem
  v_start := clock_timestamp();
  SELECT COUNT(*) INTO v_count
  FROM (
    SELECT 1 FROM information_schema.tables
      WHERE table_schema='public' AND table_name='supplier_replenishment_events'
    UNION ALL
    SELECT 1 FROM pg_matviews
      WHERE schemaname='public' AND matviewname='mv_supplier_reliability'
    UNION ALL
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname IN(
        'fn_capture_supplier_promise','fn_resolve_supplier_arrivals',
        'fn_expire_pending_promises','get_supplier_reliability_history')
    UNION ALL
    SELECT 1 FROM cron.job
      WHERE jobname IN('expire-supplier-promises','refresh-mv-supplier-reliability')
        AND active
  ) x;
  RETURN QUERY SELECT 'srt_pipeline_objects_exist'::text,'supplier_reliability'::text,
    CASE WHEN v_count=8 THEN '✅ PASS' ELSE '❌ FAIL' END::text,
    ('Objetos: '||v_count::text||'/8 (tabela+MV+4funções+2crons)')::text,
    (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;

  -- SRT-02: Eventos com resolution válido (nenhum valor inválido)
  v_start := clock_timestamp();
  SELECT COUNT(*) INTO v_count
  FROM public.supplier_replenishment_events
  WHERE resolution NOT IN ('pending','fulfilled','expired','superseded');
  RETURN QUERY SELECT 'srt_resolution_values_valid'::text,'supplier_reliability'::text,
    CASE WHEN v_count=0 THEN '✅ PASS' ELSE '❌ FAIL' END::text,
    ('Eventos com resolution inválido: '||v_count::text)::text,
    (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;

  -- SRT-03: Integridade fulfilled (deve ter actual_date, actual_quantity, arrival_snapshot_id)
  v_start := clock_timestamp();
  SELECT COUNT(*) INTO v_count
  FROM public.supplier_replenishment_events
  WHERE resolution='fulfilled'
    AND (actual_date IS NULL OR actual_quantity IS NULL OR arrival_snapshot_id IS NULL);
  RETURN QUERY SELECT 'srt_fulfilled_has_actuals'::text,'supplier_reliability'::text,
    CASE WHEN v_count=0 THEN '✅ PASS' ELSE '❌ FAIL' END::text,
    ('Fulfilled sem actuals: '||v_count::text)::text,
    (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;

  -- SRT-04: MV está atualizada (refreshed_at < 20 min atrás)
  v_start := clock_timestamp();
  SELECT COUNT(*) INTO v_count
  FROM public.mv_supplier_reliability
  WHERE refreshed_at > now() - interval '20 minutes';
  RETURN QUERY SELECT 'srt_mv_recently_refreshed'::text,'supplier_reliability'::text,
    CASE WHEN v_count>0 THEN '✅ PASS' ELSE '⚠️ WARN' END::text,
    ('Fornecedores com MV atualizada (<20min): '||v_count::text)::text,
    (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;

  -- SRT-05: Índice crítico arrival_snapshot_id existe (sem ele: Seq Scan no trigger)
  v_start := clock_timestamp();
  SELECT COUNT(*) INTO v_count
  FROM pg_indexes
  WHERE schemaname='public' AND tablename='supplier_replenishment_events'
    AND indexname='idx_sre_arrival_snapshot';
  RETURN QUERY SELECT 'srt_arrival_snapshot_index'::text,'supplier_reliability'::text,
    CASE WHEN v_count=1 THEN '✅ PASS' ELSE '❌ FAIL' END::text,
    ('idx_sre_arrival_snapshot: '||CASE WHEN v_count=1 THEN 'presente' ELSE 'AUSENTE - trigger faz Seq Scan' END)::text,
    (EXTRACT(EPOCH FROM(clock_timestamp()-v_start))*1000)::numeric;

END;
$function$;
;
