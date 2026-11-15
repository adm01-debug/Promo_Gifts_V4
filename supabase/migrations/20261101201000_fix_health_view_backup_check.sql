-- Fix: vw_system_health_quick checava 3 tabelas de backup; _backup_stock_daily_summary_20260618
-- foi apagada em 2026-11-01 (pg_cron, sessão de auditoria) e o item backup_tables_rls_locked
-- passou a retornar FAIL (alarme falso). Esta migration passa a checar só as 2 que existem.
-- Única mudança: array de 3 nomes -> 2 e "= 3" -> "= 2". Demais checks idênticos ao pg_get_viewdef atual.
-- Verificação pós-apply: SELECT result FROM public.vw_system_health_quick WHERE check_name='backup_tables_rls_locked'; -- esperado '✅ PASS'
-- Rollback: recriar a view com a lista de 3 nomes e "= 3" (a tabela apagada não existe; o item voltaria a FAIL).

CREATE OR REPLACE VIEW public.vw_system_health_quick
WITH (security_invoker = on) AS
 SELECT 'generated_columns_product_variants'::text AS check_name,
        CASE
            WHEN (( SELECT count(*) AS count
               FROM information_schema.columns
              WHERE (((columns.table_schema)::name = 'public'::name) AND ((columns.table_name)::name = 'product_variants'::name) AND ((columns.column_name)::name = ANY (ARRAY['next_entry_date'::name, 'next_entry_quantity'::name])) AND ((columns.is_generated)::text = 'ALWAYS'::text))) = 2) THEN '✅ PASS'::text
            ELSE '❌ FAIL'::text
        END AS result
UNION ALL
 SELECT 'rpc_get_promo_sales_90d_by_product'::text AS check_name,
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM (pg_proc p
                 JOIN pg_namespace n ON ((n.oid = p.pronamespace)))
              WHERE ((n.nspname = 'public'::name) AND (p.proname = 'get_promo_sales_90d_by_product'::name)))) THEN '✅ PASS'::text
            ELSE '❌ FAIL'::text
        END AS result
UNION ALL
 SELECT 'rpc_get_favorite_list_counts'::text AS check_name,
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM (pg_proc p
                 JOIN pg_namespace n ON ((n.oid = p.pronamespace)))
              WHERE ((n.nspname = 'public'::name) AND (p.proname = 'get_favorite_list_counts'::name)))) THEN '✅ PASS'::text
            ELSE '❌ FAIL'::text
        END AS result
UNION ALL
 SELECT 'rls_coverage_100pct'::text AS check_name,
        CASE
            WHEN (NOT (EXISTS ( SELECT 1
               FROM (pg_class c
                 JOIN pg_namespace n ON ((n.oid = c.relnamespace)))
              WHERE ((c.relkind = 'r'::"char") AND (n.nspname = 'public'::name) AND (c.relrowsecurity = false))))) THEN '✅ PASS'::text
            ELSE '❌ FAIL'::text
        END AS result
UNION ALL
 SELECT 'category_ancestors_rls_and_accessible'::text AS check_name,
        CASE
            WHEN (has_table_privilege('anon'::name, 'public.category_ancestors'::text, 'SELECT'::text) AND (( SELECT c.relrowsecurity
               FROM (pg_class c
                 JOIN pg_namespace n ON ((n.oid = c.relnamespace)))
              WHERE ((c.relname = 'category_ancestors'::name) AND (n.nspname = 'public'::name))) = true)) THEN '✅ PASS'::text
            ELSE '❌ FAIL'::text
        END AS result
UNION ALL
 SELECT 'backup_tables_rls_locked'::text AS check_name,
        CASE
            WHEN ((( SELECT count(*) AS count
               FROM (pg_class c
                 JOIN pg_namespace n ON ((n.oid = c.relnamespace)))
              WHERE ((n.nspname = 'public'::name) AND (c.relname = ANY (ARRAY['_bkp_kit_dims_20260619'::name, '_bkp_orphan_active_variants_20260619'::name])) AND (c.relrowsecurity = true))) = 2) AND (( SELECT count(*) AS count
               FROM pg_policies
              WHERE ((pg_policies.schemaname = 'public'::name) AND (pg_policies.tablename = ANY (ARRAY['_bkp_kit_dims_20260619'::name, '_bkp_orphan_active_variants_20260619'::name])) AND (pg_policies.cmd = 'SELECT'::text) AND (((pg_policies.roles)::text ~~* '%anon%'::text) OR ((pg_policies.roles)::text ~~* '%authenticated%'::text) OR ((pg_policies.roles)::text ~~* '%public%'::text)))) = 0) AND (NOT has_table_privilege('anon'::name, 'public._bkp_kit_dims_20260619'::text, 'SELECT'::text)) AND (NOT has_table_privilege('authenticated'::name, 'public._bkp_kit_dims_20260619'::text, 'SELECT'::text))) THEN '✅ PASS'::text
            ELSE '❌ FAIL (RLS ou grant incorreto)'::text
        END AS result
UNION ALL
 SELECT 'variant_sanitize_trigger_before_update'::text AS check_name,
        CASE
            WHEN (( SELECT pg_get_triggerdef(t.oid) AS pg_get_triggerdef
               FROM ((pg_trigger t
                 JOIN pg_class c ON ((c.oid = t.tgrelid)))
                 JOIN pg_namespace n ON ((n.oid = c.relnamespace)))
              WHERE ((c.relname = 'product_variants'::name) AND (n.nspname = 'public'::name) AND (t.tgname = 'trg_zz_sanitize_restock_dates'::name))) ~~* '%BEFORE%UPDATE%'::text) THEN '✅ PASS'::text
            ELSE '❌ FAIL'::text
        END AS result
UNION ALL
 SELECT 'fn_system_health_summary_exists'::text AS check_name,
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM (pg_proc p
                 JOIN pg_namespace n ON ((n.oid = p.pronamespace)))
              WHERE ((n.nspname = 'public'::name) AND (p.proname = 'fn_system_health_summary'::name)))) THEN '✅ PASS'::text
            ELSE '❌ FAIL'::text
        END AS result
UNION ALL
 SELECT 'useWorkspaceNotifications_rolesLoaded_guard'::text AS check_name,
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM (pg_proc p
                 JOIN pg_namespace n ON ((n.oid = p.pronamespace)))
              WHERE ((n.nspname = 'public'::name) AND (p.proname = 'fn_system_health_summary'::name)))) THEN '✅ PASS (commit f379166 — frontend fix applied 2026-06-22)'::text
            ELSE '❌ FAIL'::text
        END AS result;
