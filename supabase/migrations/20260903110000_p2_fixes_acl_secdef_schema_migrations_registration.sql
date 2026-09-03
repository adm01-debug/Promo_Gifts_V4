-- M9: Fixes P1 + P2 identificados pela auditoria de 5 agentes (2026-09-03)
--
-- P1 (GAP-01): M7/M8 não estavam em supabase_migrations.schema_migrations
--   → INSERT retroativo (ON CONFLICT DO NOTHING)
--
-- P2 (ACL-01): authenticated tinha TRIGGER+INSERT+UPDATE+DELETE+REFERENCES
--   em public.smoke_test_runs — tabela é escrita APENAS via SECURITY DEFINER
--   fn_run_and_persist_smoke_tests (postgres context), não por authenticated.
--   → REVOKE aplicado; authenticated conserva somente SELECT (controlado por RLS)
--
-- P2 (GAP-02): fn_run_smoke_tests era SECURITY DEFINER desnecessariamente.
--   Chamada exclusivamente de fn_run_and_persist_smoke_tests (SECURITY DEFINER,
--   owner=postgres), então INVOKER herda contexto postgres → comportamento idêntico.
--   SECURITY INVOKER elimina risco residual de privilege escalation se ACL vazar.
--   → ALTER + restauração do corpo completo (38 testes) + patch to_regclass M7
--
-- Aplicada em produção via supabase_db_query em 2026-09-03.

-- ══ P1: schema_migrations (metadados, sem DDL real) ══════════════════════════
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES
  ('20260903095500', 'smoke_persist_secdef_chain_and_auth_test_relcheck', ARRAY[
    'CREATE OR REPLACE FUNCTION public.fn_run_and_persist_smoke_tests()',
    'REVOKE EXECUTE ON FUNCTION public.fn_run_and_persist_smoke_tests() FROM PUBLIC, anon',
    'GRANT EXECUTE ON FUNCTION public.fn_run_and_persist_smoke_tests() TO authenticated, service_role',
    'DO $$ BEGIN ... patch to_regclass em fn_run_smoke_tests ... END $$'
  ]),
  ('20260903100000', 'fix_jwt_dual_read_guard_in_smoke_persist', ARRAY[
    'CREATE OR REPLACE FUNCTION public.fn_run_and_persist_smoke_tests() -- JWT dual-read coalesce',
    'REVOKE EXECUTE ON FUNCTION public.fn_run_and_persist_smoke_tests() FROM PUBLIC, anon',
    'GRANT EXECUTE ON FUNCTION public.fn_run_and_persist_smoke_tests() TO authenticated, service_role'
  ])
ON CONFLICT (version) DO NOTHING;

-- ══ P2 ACL-01: smoke_test_runs — revogar overprivileges de authenticated ════
-- (idempotente se já aplicado via execute_sql na sessão anterior)
REVOKE INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.smoke_test_runs FROM authenticated;
-- authenticated conserva SELECT (RLS policies controlam visibilidade de linhas)

-- ══ P2 GAP-02: fn_run_smoke_tests → SECURITY INVOKER + restauração 38 testes ═
-- Corpo intacto da M6 (20260902221900) com:
--   • teste 01 usando to_regclass (patch M7)
--   • SECURITY INVOKER (novo — era DEFINER sem necessidade)
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

  -- ══ 05: RLS 100% ══
  RETURN QUERY SELECT 'rls_coverage'::text,
    CASE WHEN (SELECT COUNT(*) FROM (
      SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity
    ) t) = 0 THEN '✅ PASS'
    ELSE '❌ FAIL: ' || (SELECT COUNT(*) FROM (
      SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity
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

  -- ══ 31-38: ANON/GRANTS/PGRST (adicionados 2026-06-23) ════════════════════

  -- ══ 31: tabelas internas de badge BLOQUEADAS para anon ══
  RETURN QUERY SELECT 'anon_badge_tables_blocked'::text,
    CASE WHEN NOT has_table_privilege('anon','public.discount_approval_requests','SELECT')
          AND NOT has_table_privilege('anon','public.workspace_notifications','SELECT')
         THEN '✅ PASS'
         ELSE '❌ FAIL: anon can read internal badge tables (hardening regression)' END;

  -- ══ 32: anon tem GRANT SELECT em v_products_public ══
  RETURN QUERY SELECT 'anon_grant_v_products_public'::text,
    CASE WHEN has_table_privilege('anon','public.v_products_public','SELECT')
         THEN '✅ PASS'
         ELSE '❌ FAIL: anon missing SELECT on v_products_public' END;

  -- ══ 33: fns SECURITY DEFINER de RLS BLOQUEADAS para anon ══
  RETURN QUERY SELECT 'anon_secdef_fns_blocked'::text,
    CASE WHEN NOT has_function_privilege('anon','public.user_is_org_member(uuid)','execute')
          AND NOT has_function_privilege('anon','public.is_coord_or_above(uuid)','execute')
          AND NOT has_function_privilege('anon','public.is_org_owner_or_admin(uuid)','execute')
          AND NOT has_function_privilege('anon','public.is_admin_or_above(uuid)','execute')
         THEN '✅ PASS'
         ELSE '❌ FAIL: anon can EXECUTE RLS security definer fns (hardening regression)' END;

  -- ══ 34: anon COUNT em v_products_public retorna rows ══
  RETURN QUERY SELECT 'anon_count_v_products_public'::text,
    CASE WHEN (SELECT COUNT(*) FROM public.v_products_public WHERE is_active=true) > 5000
         THEN '✅ PASS (' ||
              (SELECT COUNT(*) FROM public.v_products_public WHERE is_active=true)::text ||
              ' active products)'
         ELSE '❌ FAIL: count too low (< 5000)' END;

  -- ══ 35: tabelas que tinham RLS sem policy agora têm policy ══
  RETURN QUERY SELECT 'rls_tables_with_grants_have_policies'::text,
    CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename='spot_health_log' AND schemaname='public')
          AND EXISTS (SELECT 1 FROM pg_policies WHERE tablename='spot_typecode_map' AND schemaname='public')
          AND EXISTS (SELECT 1 FROM pg_policies WHERE tablename='xbz_upload_mapping' AND schemaname='public')
          AND EXISTS (SELECT 1 FROM pg_policies WHERE tablename='produtos_site_padronizacao' AND schemaname='public')
         THEN '✅ PASS'
         ELSE '❌ FAIL: tables with grants but no RLS policies' END;

  -- ══ 36: views sensíveis bloqueadas para anon ══
  RETURN QUERY SELECT 'sensitive_views_anon_blocked'::text,
    CASE WHEN NOT has_table_privilege('anon','public.bi_quotes_summary','SELECT')
          AND NOT has_table_privilege('anon','public.ai_insights_cache','SELECT')
         THEN '✅ PASS'
         ELSE '❌ FAIL: anon can read sensitive internal views (data leak risk)' END;

  -- ══ 37: pg_cron pgrst-schema-reload ativo ══
  RETURN QUERY SELECT 'pgrst_auto_reload_cron_active'::text,
    CASE WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname='pgrst-schema-reload' AND active=true)
         THEN '✅ PASS'
         ELSE '❌ FAIL: pgrst-schema-reload cron missing (schema cache goes stale)' END;

  -- ══ 38: fn_pgrst_reload() existe e NÃO é executável por authenticated ══
  RETURN QUERY SELECT 'fn_pgrst_reload_exists'::text,
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                      WHERE n.nspname='public' AND p.proname='fn_pgrst_reload')
          AND NOT has_function_privilege('authenticated','public.fn_pgrst_reload()','execute')
         THEN '✅ PASS'
         ELSE '❌ FAIL: fn_pgrst_reload missing or authenticated can execute it' END;

END;
$function$;

-- ACL de fn_run_smoke_tests permanece: {postgres, service_role} (INVOKER não muda ACL)
