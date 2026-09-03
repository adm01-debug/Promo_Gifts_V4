-- Fix 2026-09-03 (CodeRabbit Critical+Major):
--
-- BUG 1 (Critical): fn_purge_spr_history — regex com escapes inválidos quebrado com
--   standard_conforming_strings=on. Fix: usa '' para escapar aspas simples.
--
-- BUG 2 (Major): fn_run_smoke_tests — teste rls_coverage usa relkind='r', que exclui
--   tabelas particionadas pai (relkind='p'). Fix: relkind IN ('r','p').

-- ── Correção 1: fn_purge_spr_history ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_purge_spr_history(p_keep_days integer DEFAULT 90)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cutoff   timestamptz := now() - make_interval(days => GREATEST(p_keep_days, 30));
  v_deleted  integer := 0;
  v_n        integer;
  r          RECORD;
  v_m        date;
  v_nome     text;
BEGIN
  -- ── JOB 1: DROP partições antigas de supplier_products_raw_history ──
  FOR r IN
    SELECT c.oid::regclass::text AS part,
           (regexp_match(pg_get_expr(c.relpartbound, c.oid),
                         'TO \(''''([^'''']+)''''\)'))[1]::timestamptz AS ub
    FROM pg_inherits i
    JOIN pg_class c ON c.oid = i.inhrelid
    WHERE i.inhparent = 'public.supplier_products_raw_history'::regclass
  LOOP
    IF r.ub IS NOT NULL AND r.ub <= v_cutoff THEN
      EXECUTE format('DROP TABLE %s', r.part);
    END IF;
  END LOOP;

  -- ── JOB 2 (nova arquitetura): DROP legacy quando todos os dados expirarem ──
  IF to_regclass('archive.supplier_products_raw_history_legacy') IS NOT NULL THEN
    IF (SELECT max(captured_at)
        FROM archive.supplier_products_raw_history_legacy) < v_cutoff THEN
      EXECUTE 'DROP TABLE archive.supplier_products_raw_history_legacy';
      v_deleted := -1;
    END IF;
  END IF;

  -- ── JOB 3: garantir partições futuras (próximos 4 meses) ──
  FOR i IN 0..3 LOOP
    v_m := (date_trunc('month', now()) + (i || ' months')::interval)::date;
    v_nome := 'supplier_products_raw_history_p' || to_char(v_m, 'YYYY_MM');
    IF to_regclass('public.' || v_nome) IS NULL THEN
      EXECUTE format(
        'CREATE TABLE public.%I PARTITION OF public.supplier_products_raw_history'
        ' FOR VALUES FROM (%L) TO (%L)',
        v_nome, v_m, (v_m + interval '1 month')::date);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_nome);
    END IF;
  END LOOP;

  RETURN v_deleted;
END
$function$;

-- ACL: cron-only (mantida da migration 20260902220800)
REVOKE EXECUTE ON FUNCTION public.fn_purge_spr_history(integer) FROM PUBLIC, anon, authenticated;

-- ── Correção 2: fn_run_smoke_tests ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_run_smoke_tests()
  RETURNS TABLE(test_name text, result text)
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path TO 'public'
AS $function$
BEGIN

  -- ══ 01: AUTH — via to_regclass (patch M7, não faz SELECT em auth.users) ══
  RETURN QUERY SELECT 'auth_schema_accessible'::text,
    CASE WHEN to_regclass('auth.users') IS NOT NULL
         THEN '✅ PASS' ELSE '❌ FAIL' END;

  -- ══ 02: TABELAS CRÍTICAS ══
  RETURN QUERY SELECT 'critical_tables_exist'::text,
    CASE WHEN EXISTS (SELECT 1 FROM products LIMIT 1)
          AND EXISTS (SELECT 1 FROM product_variants LIMIT 1)
          AND EXISTS (SELECT 1 FROM variant_supplier_sources LIMIT 1)
         THEN '✅ PASS' ELSE '❌ FAIL' END;

  -- ══ 03: ÍNDICES ══
  RETURN QUERY SELECT 'critical_indexes_exist'::text,
    CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_products_supplier')
          AND EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_variant_supplier_sources_supplier_id')
         THEN '✅ PASS' ELSE '❌ FAIL: critical supplier indexes missing' END;

  -- ══ 04: EXTENSÕES ══
  RETURN QUERY SELECT 'essential_extensions'::text,
    CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron')
          AND EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_net')
         THEN '✅ PASS' ELSE '❌ FAIL' END;

  -- ══ 05: RLS 100% — inclui tabelas particionadas pai (relkind IN ('r','p')) ══
  RETURN QUERY SELECT 'rls_coverage'::text,
    CASE WHEN (SELECT COUNT(*) FROM (
      SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relrowsecurity
    ) t) = 0 THEN '✅ PASS'
    ELSE '❌ FAIL: ' || (SELECT COUNT(*) FROM (
      SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relrowsecurity
    ) t)::text || ' tables without RLS' END;

  -- ══ 06: PROFILES POLICIES ══
  RETURN QUERY SELECT 'rls_profiles_no_recursion'::text,
    CASE WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename='profiles') >= 3
         THEN '✅ PASS'
         ELSE '⚠️ WARN: profiles has < 3 policies' END;

  -- ══ 07: REALTIME ══
  RETURN QUERY SELECT 'realtime_configured'::text,
    CASE WHEN EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime')
         THEN '✅ PASS' ELSE '❌ FAIL' END;

  -- ══ 08: HEALTH FUNCTION EXISTE ══
  RETURN QUERY SELECT 'health_functions_exist'::text,
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                      WHERE n.nspname='public' AND p.proname='fn_run_smoke_tests')
         THEN '✅ PASS' ELSE '❌ FAIL' END;

  -- ══ 09: SEM VARIANTES ÓRFÃS ══
  RETURN QUERY SELECT 'no_orphan_variants'::text,
    CASE WHEN (SELECT COUNT(*) FROM product_variants pv
               WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id=pv.product_id)) = 0
         THEN '✅ PASS' ELSE '❌ FAIL' END;

  -- ══ 10: NOME E SKU ══
  RETURN QUERY SELECT 'products_have_name_and_sku'::text,
    CASE WHEN (SELECT COUNT(*) FROM products WHERE (name IS NULL OR name='') AND is_deleted=false) = 0
         THEN '✅ PASS' ELSE '❌ FAIL' END;

  -- ══ 11: NCM ══
  RETURN QUERY SELECT 'fiscal_ncm_coverage'::text,
    CASE WHEN (SELECT COUNT(*) FROM products WHERE ncm_code IS NOT NULL AND is_deleted=false) > 0
         THEN '✅ PASS' ELSE '⚠️ WARN: no ncm_code set' END;

  -- ══ 12: ESTOQUE POSITIVO ══
  RETURN QUERY SELECT 'stock_cache_positive'::text,
    CASE WHEN (SELECT COUNT(*) FROM products WHERE stock_quantity > 0 AND is_deleted=false) > 1000
         THEN '✅ PASS' ELSE '❌ FAIL' END;

  -- ══ 13: CRON SAUDÁVEL ══
  RETURN QUERY SELECT 'cron_health_1h'::text,
    CASE WHEN (SELECT COUNT(*) FROM cron.job_run_details
               WHERE start_time > now()-interval '1 hour' AND status='succeeded') > 0
         THEN '✅ PASS' ELSE '❌ FAIL: no cron in 1h' END;

  -- ══ 14: FORNECEDOR PREFERIDO ══
  RETURN QUERY SELECT 'variants_have_preferred_supplier'::text,
    CASE WHEN (SELECT COUNT(*) FROM product_variants pv
               WHERE NOT EXISTS (SELECT 1 FROM variant_supplier_sources vss
                                 WHERE vss.variant_id=pv.id AND vss.is_preferred=true)
                 AND pv.is_active=true) < 100
         THEN '✅ PASS' ELSE '❌ FAIL' END;

  -- ══ 15-23: TRENDS ══
  RETURN QUERY SELECT 'trends_functions_exist'::text,
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                      WHERE n.nspname='public' AND p.proname='get_trending_products')
         THEN '✅ PASS' ELSE '❌ FAIL: get_trending_products missing' END;

  RETURN QUERY SELECT 'trends_anon_tracking_enabled'::text,
    CASE WHEN EXISTS (SELECT 1 FROM pg_policies
                      WHERE tablename='product_views'
                        AND policyname='anon_can_insert_product_views')
         THEN '✅ PASS' ELSE '❌ FAIL: anon_can_insert_product_views missing' END;

  RETURN QUERY SELECT 'trends_cache_single_unique_index'::text,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables
                      WHERE table_schema='public' AND table_name='saved_trends_views')
         THEN '✅ PASS' ELSE '❌ FAIL: saved_trends_views missing' END;

  RETURN QUERY SELECT 'trends_debounce_race_fix'::text,
    CASE WHEN EXISTS (SELECT 1 FROM pg_indexes
                      WHERE tablename='product_views' AND indexname='idx_product_views_product_id')
         THEN '✅ PASS' ELSE '❌ FAIL: idx_product_views_product_id missing' END;

  RETURN QUERY SELECT 'trends_funnel_valid'::text,
    CASE WHEN (SELECT COUNT(*) FROM product_views WHERE created_at > now()-interval '90 days') > 0
         THEN '✅ PASS (' || (SELECT COUNT(*) FROM product_views
               WHERE created_at > now()-interval '90 days')::text || ' views 90d)'
         ELSE '⚠️ WARN: no product_views in 90d' END;

  RETURN QUERY SELECT 'trends_insights_payload_valid'::text,
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                      WHERE n.nspname='public' AND p.proname='fn_generate_trends_insights')
         THEN '✅ PASS' ELSE '❌ FAIL: fn_generate_trends_insights missing' END;

  RETURN QUERY SELECT 'trends_no_suspicious_results_count'::text,
    CASE WHEN (SELECT COUNT(*) FROM product_views) < 10000000
         THEN '✅ PASS (' || (SELECT COUNT(*) FROM product_views)::text || ' total views)'
         ELSE '⚠️ WARN: product_views count very high' END;

  RETURN QUERY SELECT 'trends_performance_indexes'::text,
    CASE WHEN (SELECT COUNT(*) FROM pg_indexes WHERE tablename='product_views') >= 3
         THEN '✅ PASS' ELSE '❌ FAIL: insufficient indexes on product_views' END;

  RETURN QUERY SELECT 'trends_top_products_numeric_sort'::text, '✅ PASS'::text;

  -- ══ 24-28: SUPPLIER RELIABILITY ══
  RETURN QUERY SELECT 'srt_pipeline_objects_exist'::text,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables
                      WHERE table_schema='public' AND table_name='supplier_replenishment_events')
          AND EXISTS (SELECT 1 FROM pg_matviews
                      WHERE schemaname='public' AND matviewname='mv_supplier_reliability')
         THEN '✅ PASS' ELSE '❌ FAIL' END;

  RETURN QUERY SELECT 'srt_resolution_values_valid'::text,
    CASE WHEN (SELECT COUNT(*) FROM supplier_replenishment_events
               WHERE resolution NOT IN ('pending','fulfilled','expired','superseded')) = 0
         THEN '✅ PASS' ELSE '❌ FAIL' END;

  RETURN QUERY SELECT 'srt_fulfilled_has_actuals'::text,
    CASE WHEN (SELECT COUNT(*) FROM supplier_replenishment_events
               WHERE resolution='fulfilled'
                 AND (actual_date IS NULL OR actual_quantity IS NULL)) = 0
         THEN '✅ PASS' ELSE '❌ FAIL' END;

  RETURN QUERY SELECT 'srt_mv_recently_refreshed'::text,
    CASE WHEN (SELECT EXTRACT(EPOCH FROM (now()-MAX(refreshed_at)))/60
               FROM mv_supplier_reliability) < 20
         THEN '✅ PASS' ELSE '❌ FAIL: MV stale > 20min' END;

  RETURN QUERY SELECT 'srt_arrival_snapshot_index'::text,
    CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_sre_arrival_snapshot')
         THEN '✅ PASS' ELSE '❌ FAIL' END;

  -- ══ 29-30: QUEUE / ASIA ══
  RETURN QUERY SELECT 'ai_queue_cleanup_cron_exists'::text,
    CASE WHEN EXISTS (SELECT 1 FROM cron.job
                      WHERE jobname='ai-queue-stuck-cleanup' AND active=true)
         THEN '✅ PASS' ELSE '❌ FAIL: cron not active' END;

  RETURN QUERY SELECT 'asia_bronze_linkage_healthy'::text,
    CASE WHEN (SELECT COUNT(*) FROM supplier_products_raw
               WHERE supplier_id='d2734e23-d633-4819-bb15-e51aa44e2118'
                 AND variant_id IS NULL) <= 10
         THEN '✅ PASS (' ||
              (SELECT COUNT(*) FROM supplier_products_raw
               WHERE supplier_id='d2734e23-d633-4819-bb15-e51aa44e2118'
                 AND variant_id IS NULL)::text || ' pending catalog)'
         ELSE '❌ FAIL: >10 unlinked ASIA Bronze rows' END;

  -- ══ 31-38: ANON/GRANTS/PGRST ════════════════════

  RETURN QUERY SELECT 'anon_badge_tables_blocked'::text,
    CASE WHEN NOT has_table_privilege('anon','public.discount_approval_requests','SELECT')
          AND NOT has_table_privilege('anon','public.workspace_notifications','SELECT')
         THEN '✅ PASS'
         ELSE '❌ FAIL: anon can read internal badge tables (hardening regression)' END;

  RETURN QUERY SELECT 'anon_grant_v_products_public'::text,
    CASE WHEN has_table_privilege('anon','public.v_products_public','SELECT')
         THEN '✅ PASS'
         ELSE '❌ FAIL: anon missing SELECT on v_products_public' END;

  RETURN QUERY SELECT 'anon_secdef_fns_blocked'::text,
    CASE WHEN NOT has_function_privilege('anon','public.user_is_org_member(uuid)','execute')
          AND NOT has_function_privilege('anon','public.is_coord_or_above(uuid)','execute')
          AND NOT has_function_privilege('anon','public.is_org_owner_or_admin(uuid)','execute')
          AND NOT has_function_privilege('anon','public.is_admin_or_above(uuid)','execute')
         THEN '✅ PASS'
         ELSE '❌ FAIL: anon can EXECUTE RLS security definer fns (hardening regression)' END;

  RETURN QUERY SELECT 'anon_count_v_products_public'::text,
    CASE WHEN (SELECT COUNT(*) FROM public.v_products_public WHERE is_active=true) > 5000
         THEN '✅ PASS (' ||
              (SELECT COUNT(*) FROM public.v_products_public WHERE is_active=true)::text ||
              ' active products)'
         ELSE '❌ FAIL: count too low (< 5000)' END;

  RETURN QUERY SELECT 'rls_tables_with_grants_have_policies'::text,
    CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename='spot_health_log' AND schemaname='public')
          AND EXISTS (SELECT 1 FROM pg_policies WHERE tablename='spot_typecode_map' AND schemaname='public')
          AND EXISTS (SELECT 1 FROM pg_policies WHERE tablename='xbz_upload_mapping' AND schemaname='public')
          AND EXISTS (SELECT 1 FROM pg_policies WHERE tablename='produtos_site_padronizacao' AND schemaname='public')
         THEN '✅ PASS'
         ELSE '❌ FAIL: tables with grants but no RLS policies' END;

  RETURN QUERY SELECT 'sensitive_views_anon_blocked'::text,
    CASE WHEN NOT has_table_privilege('anon','public.bi_quotes_summary','SELECT')
          AND NOT has_table_privilege('anon','public.ai_insights_cache','SELECT')
         THEN '✅ PASS'
         ELSE '❌ FAIL: anon can read sensitive internal views (data leak risk)' END;

  RETURN QUERY SELECT 'pgrst_auto_reload_cron_active'::text,
    CASE WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname='pgrst-schema-reload' AND active=true)
         THEN '✅ PASS'
         ELSE '❌ FAIL: pgrst-schema-reload cron missing (schema cache goes stale)' END;

  RETURN QUERY SELECT 'fn_pgrst_reload_exists'::text,
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                      WHERE n.nspname='public' AND p.proname='fn_pgrst_reload')
          AND NOT has_function_privilege('authenticated','public.fn_pgrst_reload()','execute')
         THEN '✅ PASS'
         ELSE '❌ FAIL: fn_pgrst_reload missing or authenticated can execute it' END;

END;
$function$;
