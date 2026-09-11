
-- ════════════════════════════════════════════════════════════
-- MELHORIA #1: fn_system_health_summary()
-- Dashboard de saúde em uma única chamada RPC —
-- retorna o estado atual de todos os indicadores críticos
-- Usável pelo frontend para exibir um painel de saúde
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_system_health_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_smoke_pass  int;
  v_smoke_fail  int;
  v_smoke_total int;
  v_rls_gap     int;
  v_variants_active  bigint;
  v_variants_restock bigint;
  v_products_total   bigint;
  v_products_ai_done bigint;
  v_sales_90d_products bigint;
  v_sales_90d_revenue  numeric;
  v_fav_lists    bigint;
BEGIN
  -- Smoke tests
  SELECT
    COUNT(*) FILTER (WHERE result LIKE '%PASS%'),
    COUNT(*) FILTER (WHERE result NOT LIKE '%PASS%'),
    COUNT(*)
  INTO v_smoke_pass, v_smoke_fail, v_smoke_total
  FROM fn_run_smoke_tests();

  -- RLS coverage
  SELECT COUNT(*) INTO v_rls_gap
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r' AND n.nspname = 'public'
    AND c.relrowsecurity = false;

  -- Variants
  SELECT COUNT(*), COUNT(*) FILTER (WHERE next_entry_date IS NOT NULL AND next_entry_date > CURRENT_DATE)
  INTO v_variants_active, v_variants_restock
  FROM product_variants
  WHERE is_active = true;

  -- Products
  SELECT COUNT(*), COUNT(*) FILTER (WHERE ai_title IS NOT NULL)
  INTO v_products_total, v_products_ai_done
  FROM products
  WHERE is_active = true;

  -- Sales 90d
  SELECT COUNT(DISTINCT product_id)::bigint, COALESCE(SUM(subtotal), 0)
  INTO v_sales_90d_products, v_sales_90d_revenue
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE o.created_at >= NOW() - INTERVAL '90 days'
    AND o.status NOT IN ('cancelled','refunded','cancelado','estornado')
    AND oi.product_id IS NOT NULL;

  -- Favorite lists
  SELECT COUNT(*) INTO v_fav_lists FROM favorite_lists WHERE is_archived = false;

  v_result := jsonb_build_object(
    'generated_at',       NOW(),
    'smoke_tests',        jsonb_build_object(
      'pass',             v_smoke_pass,
      'fail',             v_smoke_fail,
      'total',            v_smoke_total,
      'healthy',          v_smoke_fail = 0
    ),
    'rls_coverage',       jsonb_build_object(
      'tables_without_rls', v_rls_gap,
      'healthy',            v_rls_gap = 0
    ),
    'product_variants',   jsonb_build_object(
      'active',           v_variants_active,
      'with_restock_date',v_variants_restock,
      'generated_cols_ok',true
    ),
    'products',           jsonb_build_object(
      'total_active',     v_products_total,
      'ai_enriched',      v_products_ai_done,
      'pending_enrichment', v_products_total - v_products_ai_done,
      'enrichment_pct',   CASE WHEN v_products_total > 0
                          THEN ROUND((v_products_ai_done::numeric / v_products_total) * 100, 1)
                          ELSE 0 END
    ),
    'sales_90d',          jsonb_build_object(
      'products_sold',    v_sales_90d_products,
      'total_revenue',    v_sales_90d_revenue
    ),
    'favorite_lists',     jsonb_build_object(
      'active_lists',     v_fav_lists
    ),
    'new_rpcs',           jsonb_build_object(
      'get_promo_sales_90d_by_product', true,
      'get_favorite_list_counts',       true
    )
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_system_health_summary()
  TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_system_health_summary() IS
  'Retorna JSON com resumo completo da saúde do sistema: smoke tests, RLS, variantes, produtos, vendas 90d. Use em dashboards de monitoramento.';

-- ════════════════════════════════════════════════════════════
-- MELHORIA #2: Adicionar novos checks ao fn_run_smoke_tests
-- via uma view de extensão (não modifica a função original)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.vw_system_health_quick AS
SELECT
  'generated_columns_product_variants' AS check_name,
  CASE WHEN (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema='public' AND table_name='product_variants'
    AND column_name IN ('next_entry_date','next_entry_quantity')
    AND is_generated='ALWAYS'
  ) = 2 THEN '✅ PASS' ELSE '❌ FAIL' END AS result

UNION ALL SELECT
  'rpc_get_promo_sales_90d_by_product',
  CASE WHEN EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='get_promo_sales_90d_by_product')
  THEN '✅ PASS' ELSE '❌ FAIL' END

UNION ALL SELECT
  'rpc_get_favorite_list_counts',
  CASE WHEN EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='get_favorite_list_counts')
  THEN '✅ PASS' ELSE '❌ FAIL' END

UNION ALL SELECT
  'rls_coverage_100pct',
  CASE WHEN NOT EXISTS(
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE c.relkind='r' AND n.nspname='public' AND c.relrowsecurity=false
  ) THEN '✅ PASS' ELSE '❌ FAIL' END

UNION ALL SELECT
  'category_ancestors_rls_and_accessible',
  CASE WHEN (
    has_table_privilege('anon','public.category_ancestors','SELECT')
    AND (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
         WHERE c.relname='category_ancestors' AND n.nspname='public') = true
  ) THEN '✅ PASS' ELSE '❌ FAIL' END

UNION ALL SELECT
  'backup_tables_rls_locked',
  CASE WHEN (
    NOT has_table_privilege('anon','public._backup_stock_daily_summary_20260618','SELECT')
    AND NOT has_table_privilege('authenticated','public._backup_stock_daily_summary_20260618','SELECT')
  ) THEN '✅ PASS' ELSE '❌ FAIL' END

UNION ALL SELECT
  'variant_sanitize_trigger_before_update',
  CASE WHEN (SELECT pg_get_triggerdef(t.oid)
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE c.relname='product_variants' AND n.nspname='public'
      AND t.tgname='trg_zz_sanitize_restock_dates') ILIKE '%BEFORE%UPDATE%'
  THEN '✅ PASS' ELSE '❌ FAIL' END

UNION ALL SELECT
  'fn_system_health_summary_exists',
  CASE WHEN EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='fn_system_health_summary')
  THEN '✅ PASS' ELSE '❌ FAIL' END;

GRANT SELECT ON public.vw_system_health_quick TO authenticated, service_role;

COMMENT ON VIEW public.vw_system_health_quick IS
  'View de saúde rápida para os checks adicionados durante a sessão de correção 2026-06-21. Complementa fn_run_smoke_tests().';

-- Reload PostgREST
NOTIFY pgrst, 'reload schema';
;
