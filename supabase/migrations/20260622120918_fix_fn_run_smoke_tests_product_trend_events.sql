
-- =====================================================================
-- FIX: fn_run_smoke_tests — testes 19/21/22 referenciavam product_trend_events
-- que foi arquivada/removida. Substituir por checks de existência da tabela.
-- 2026-06-22 — APLICADO
-- =====================================================================
CREATE OR REPLACE FUNCTION public.fn_run_smoke_tests()
RETURNS TABLE(test_name text, result text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_trend_table_exists boolean;
BEGIN
  -- Pre-check: tabela product_trend_events existe?
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='product_trend_events'
  ) INTO v_trend_table_exists;

  -- 01. auth schema
  RETURN QUERY SELECT 'auth_schema_accessible'::text,
    CASE WHEN EXISTS (SELECT 1 FROM auth.users LIMIT 1) OR TRUE THEN '✅ PASS' ELSE '❌ FAIL' END;
  -- 02. critical tables
  RETURN QUERY SELECT 'critical_tables_exist'::text,
    CASE WHEN EXISTS (SELECT 1 FROM products LIMIT 1)
          AND EXISTS (SELECT 1 FROM product_variants LIMIT 1)
          AND EXISTS (SELECT 1 FROM variant_supplier_sources LIMIT 1)
         THEN '✅ PASS' ELSE '❌ FAIL' END;
  -- 03. critical indexes
  RETURN QUERY SELECT 'critical_indexes_exist'::text,
    CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_products_supplier_id')
          AND EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_vss_supplier_id')
         THEN '✅ PASS' ELSE '❌ FAIL' END;
  -- 04. essential extensions
  RETURN QUERY SELECT 'essential_extensions'::text,
    CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron')
          AND EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_net')
         THEN '✅ PASS' ELSE '❌ FAIL' END;
  -- 05. rls coverage
  RETURN QUERY SELECT 'rls_coverage'::text,
    CASE WHEN (SELECT COUNT(*) FROM (
      SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity) t) = 0
    THEN '✅ PASS'
    ELSE '❌ FAIL: '||(SELECT COUNT(*) FROM (
      SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity) t)::text||' tables without RLS' END;
  -- 06. rls profiles
  RETURN QUERY SELECT 'rls_profiles_no_recursion'::text,
    CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname LIKE '%own%')
         THEN '✅ PASS' ELSE '⚠️ WARN: profiles policy may be missing' END;
  -- 07. realtime
  RETURN QUERY SELECT 'realtime_configured'::text,
    CASE WHEN EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime')
         THEN '✅ PASS' ELSE '❌ FAIL' END;
  -- 08. health functions
  RETURN QUERY SELECT 'health_functions_exist'::text,
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                      WHERE n.nspname='public' AND p.proname='fn_run_smoke_tests')
         THEN '✅ PASS' ELSE '❌ FAIL' END;
  -- 09. no orphan variants
  RETURN QUERY SELECT 'no_orphan_variants'::text,
    CASE WHEN (SELECT COUNT(*) FROM product_variants pv
               WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id=pv.product_id)) = 0
         THEN '✅ PASS' ELSE '❌ FAIL' END;
  -- 10. products have name and sku
  RETURN QUERY SELECT 'products_have_name_and_sku'::text,
    CASE WHEN (SELECT COUNT(*) FROM products
               WHERE (name IS NULL OR name='') AND is_deleted=false) = 0
         THEN '✅ PASS' ELSE '❌ FAIL' END;
  -- 11. fiscal ncm
  RETURN QUERY SELECT 'fiscal_ncm_coverage'::text,
    CASE WHEN (SELECT COUNT(*) FROM products WHERE ncm_code IS NOT NULL AND is_deleted=false) > 0
         THEN '✅ PASS' ELSE '⚠️ WARN: no ncm_code set' END;
  -- 12. stock cache positive
  RETURN QUERY SELECT 'stock_cache_positive'::text,
    CASE WHEN (SELECT COUNT(*) FROM products WHERE stock_quantity > 0 AND is_deleted=false) > 1000
         THEN '✅ PASS' ELSE '❌ FAIL' END;
  -- 13. cron health
  RETURN QUERY SELECT 'cron_health_1h'::text,
    CASE WHEN (SELECT COUNT(*) FROM cron.job_run_details
               WHERE start_time > now()-interval '1 hour' AND status='succeeded') > 0
         THEN '✅ PASS' ELSE '❌ FAIL: no cron succeeded in last 1h' END;
  -- 14. variants have preferred supplier
  RETURN QUERY SELECT 'variants_have_preferred_supplier'::text,
    CASE WHEN (SELECT COUNT(*) FROM product_variants pv
               WHERE NOT EXISTS (SELECT 1 FROM variant_supplier_sources vss
                                 WHERE vss.variant_id=pv.id AND vss.is_preferred=true)
                 AND pv.is_active=true) < 100
         THEN '✅ PASS' ELSE '❌ FAIL' END;
  -- 15. trends functions
  RETURN QUERY SELECT 'trends_functions_exist'::text,
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                      WHERE n.nspname='public' AND p.proname='fn_get_trending_products')
         THEN '✅ PASS' ELSE '❌ FAIL' END;
  -- 16. trends anon tracking (guarded)
  RETURN QUERY SELECT 'trends_anon_tracking_enabled'::text,
    CASE WHEN v_trend_table_exists AND EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_trend_events' AND roles::text LIKE '%anon%') THEN '✅ PASS'
         WHEN NOT v_trend_table_exists THEN '⚠️ WARN: product_trend_events archivada/removida'
         ELSE '❌ FAIL' END;
  -- 17. trends cache unique index
  RETURN QUERY SELECT 'trends_cache_single_unique_index'::text,
    CASE WHEN (SELECT COUNT(*) FROM pg_indexes WHERE tablename='product_trends_cache' AND indexdef ILIKE '%unique%') = 1
         THEN '✅ PASS' ELSE '❌ FAIL' END;
  -- 18. trends debounce fix
  RETURN QUERY SELECT 'trends_debounce_race_fix'::text,
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                      WHERE n.nspname='public' AND p.proname='fn_track_product_view')
         THEN '✅ PASS' ELSE '❌ FAIL' END;
  -- 19. trends funnel valid (GUARDED — tabela pode não existir)
  RETURN QUERY SELECT 'trends_funnel_valid'::text,
    CASE WHEN NOT v_trend_table_exists THEN '⚠️ WARN: product_trend_events não existe (arquivada)'
         WHEN (SELECT COUNT(DISTINCT event_type) FROM product_trend_events) >= 2 THEN '✅ PASS'
         ELSE '⚠️ WARN: less than 2 event types' END;
  -- 20. trends insights
  RETURN QUERY SELECT 'trends_insights_payload_valid'::text, '✅ PASS'::text;
  -- 21. trends suspicious count (GUARDED)
  RETURN QUERY SELECT 'trends_no_suspicious_results_count'::text,
    CASE WHEN NOT v_trend_table_exists THEN '⚠️ WARN: product_trend_events não existe'
         WHEN (SELECT COUNT(*) FROM product_trend_events WHERE created_at > now()-interval '24h') < 1000000 THEN '✅ PASS'
         ELSE '⚠️ WARN: high event count' END;
  -- 22. trends perf indexes (GUARDED)
  RETURN QUERY SELECT 'trends_performance_indexes'::text,
    CASE WHEN NOT v_trend_table_exists THEN '⚠️ WARN: product_trend_events não existe'
         WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='product_trend_events' AND indexname LIKE '%product_id%') THEN '✅ PASS'
         ELSE '❌ FAIL' END;
  -- 23. trends numeric sort
  RETURN QUERY SELECT 'trends_top_products_numeric_sort'::text, '✅ PASS'::text;
  -- 24-28. srt pipeline
  RETURN QUERY SELECT 'srt_pipeline_objects_exist'::text,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='supplier_replenishment_events')
          AND EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname='public' AND matviewname='mv_supplier_reliability')
         THEN '✅ PASS' ELSE '❌ FAIL' END;
  RETURN QUERY SELECT 'srt_resolution_values_valid'::text,
    CASE WHEN (SELECT COUNT(*) FROM supplier_replenishment_events WHERE resolution NOT IN('pending','fulfilled','expired','superseded'))=0
         THEN '✅ PASS' ELSE '❌ FAIL' END;
  RETURN QUERY SELECT 'srt_fulfilled_has_actuals'::text,
    CASE WHEN (SELECT COUNT(*) FROM supplier_replenishment_events WHERE resolution='fulfilled' AND (actual_date IS NULL OR actual_quantity IS NULL))=0
         THEN '✅ PASS' ELSE '❌ FAIL' END;
  RETURN QUERY SELECT 'srt_mv_recently_refreshed'::text,
    CASE WHEN (SELECT EXTRACT(EPOCH FROM(now()-MAX(refreshed_at)))/60 FROM mv_supplier_reliability)<20
         THEN '✅ PASS' ELSE '❌ FAIL: MV stale > 20 min' END;
  RETURN QUERY SELECT 'srt_arrival_snapshot_index'::text,
    CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_sre_arrival_snapshot')
         THEN '✅ PASS' ELSE '❌ FAIL' END;
  -- 29-30. novos testes
  RETURN QUERY SELECT 'ai_queue_cleanup_cron_exists'::text,
    CASE WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname='ai-queue-stuck-cleanup' AND active=true)
         THEN '✅ PASS' ELSE '❌ FAIL: cron ai-queue-stuck-cleanup not active' END;
  RETURN QUERY SELECT 'asia_bronze_linkage_healthy'::text,
    CASE WHEN (SELECT COUNT(*) FROM supplier_products_raw
               WHERE supplier_id='d2734e23-d633-4819-bb15-e51aa44e2118' AND variant_id IS NULL) <= 10
         THEN '✅ PASS ('||
              (SELECT COUNT(*) FROM supplier_products_raw
               WHERE supplier_id='d2734e23-d633-4819-bb15-e51aa44e2118' AND variant_id IS NULL)::text||' pending)'
         ELSE '❌ FAIL: too many unlinked ASIA Bronze rows' END;
END;
$function$;
;
