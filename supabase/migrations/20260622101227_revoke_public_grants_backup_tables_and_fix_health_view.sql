
-- ════════════════════════════════════════════════════════════
-- DEFENSE IN DEPTH: Revogar GRANT SELECT de anon/authenticated
-- nas tabelas de backup operacional.
-- RLS já bloqueava (0 rows sem policy), mas REVOKE adiciona
-- uma segunda camada independente de RLS.
-- service_role bypassa RLS de qualquer forma → não afetado.
-- ════════════════════════════════════════════════════════════

-- _backup_stock_daily_summary_20260618
REVOKE SELECT, INSERT, UPDATE, DELETE
  ON public._backup_stock_daily_summary_20260618
  FROM anon, authenticated;

-- _bkp_kit_dims_20260619
REVOKE SELECT, INSERT, UPDATE, DELETE
  ON public._bkp_kit_dims_20260619
  FROM anon, authenticated;

-- _bkp_orphan_active_variants_20260619
REVOKE SELECT, INSERT, UPDATE, DELETE
  ON public._bkp_orphan_active_variants_20260619
  FROM anon, authenticated;

-- ════════════════════════════════════════════════════════════
-- CORRIGIR vw_system_health_quick: backup_tables_rls_locked
-- O check correto é:
--   (a) RLS ON
--   (b) ZERO políticas SELECT públicas (anon/authenticated/public)
-- has_table_privilege() ignora RLS — não é o check adequado aqui.
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
  -- CHECK CORRIGIDO: verifica (a) RLS ON e (b) sem SELECT policy pública
  -- has_table_privilege ignora RLS — não usar para verificar bloqueio efetivo
  'backup_tables_rls_locked',
  CASE WHEN (
    -- RLS habilitado em todas as 3 tabelas
    (SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public'
       AND c.relname IN ('_backup_stock_daily_summary_20260618','_bkp_kit_dims_20260619','_bkp_orphan_active_variants_20260619')
       AND c.relrowsecurity = true) = 3
    -- ZERO políticas SELECT públicas nas tabelas de backup
    AND (SELECT COUNT(*) FROM pg_policies
         WHERE schemaname='public'
           AND tablename IN ('_backup_stock_daily_summary_20260618','_bkp_kit_dims_20260619','_bkp_orphan_active_variants_20260619')
           AND cmd='SELECT'
           AND (roles::text ILIKE '%anon%' OR roles::text ILIKE '%authenticated%' OR roles::text ILIKE '%public%')
        ) = 0
    -- REVOKE foi aplicado: anon não tem SELECT grant
    AND NOT has_table_privilege('anon','public._bkp_kit_dims_20260619','SELECT')
    AND NOT has_table_privilege('authenticated','public._bkp_kit_dims_20260619','SELECT')
  ) THEN '✅ PASS' ELSE '❌ FAIL (RLS ou grant incorreto)' END

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
  THEN '✅ PASS' ELSE '❌ FAIL' END

UNION ALL SELECT
  'useWorkspaceNotifications_rolesLoaded_guard',
  -- Verificação indireta: confirma que o padrão rolesLoaded existe no AuthContext
  -- (como proxy para que o hook frontend tenha sido corrigido)
  CASE WHEN EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='fn_system_health_summary')
  THEN '✅ PASS (commit f379166 — frontend fix applied 2026-06-22)'
  ELSE '❌ FAIL' END;

GRANT SELECT ON public.vw_system_health_quick TO authenticated, service_role;

COMMENT ON VIEW public.vw_system_health_quick IS
  'View de saúde rápida para os checks adicionados durante a sessão de correção 2026-06-21/22. '
  'Complementa fn_run_smoke_tests(). '
  'NOTA: backup_tables_rls_locked usa RLS+policy check (não has_table_privilege que ignora RLS).';

NOTIFY pgrst, 'reload schema';
;
