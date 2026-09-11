
-- ============================================================
-- MELHORIA 5/7: fn_anon_access_audit() — diagnóstico permanente
-- Detecta proativamente:
--   A) Tabelas com grants anon mas sem RLS policy → 0 rows silencioso
--   B) Funções em policies PUBLIC sem EXECUTE para anon → HTTP 500
--   C) Views sensíveis acessíveis por anon → data leak
--   D) Tabelas que deveriam ter anon SELECT mas não têm → HTTP 403
-- Usar: SELECT * FROM fn_anon_access_audit();
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_anon_access_audit()
RETURNS TABLE(
  categoria    text,
  objeto       text,
  anon_grant   boolean,
  auth_grant   boolean,
  severidade   text,
  descricao    text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  -- A: Tabelas com GRANT SELECT para anon MAS sem nenhuma RLS policy
  -- → anon tem grant mas recebe 0 rows silencioso (pode ser bug)
  RETURN QUERY
  SELECT 
    'RLS_SEM_POLICY'::text AS categoria,
    c.relname::text AS objeto,
    has_table_privilege('anon', c.oid, 'SELECT') AS anon_grant,
    has_table_privilege('authenticated', c.oid, 'SELECT') AS auth_grant,
    CASE WHEN has_table_privilege('anon', c.oid, 'SELECT') 
              OR has_table_privilege('authenticated', c.oid, 'SELECT')
         THEN 'HIGH'::text ELSE 'INFO'::text END AS severidade,
    'Tabela com RLS ativa mas sem nenhuma policy → TODOS recebem 0 rows'::text AS descricao
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = true
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies p 
      WHERE p.tablename = c.relname AND p.schemaname = 'public'
    )
    AND c.relname NOT LIKE '%_p2026_%'
    AND c.relname NOT LIKE '_bkp_%'
    AND c.relname NOT LIKE '_backup_%'
  ORDER BY c.relname;

  -- B: Funções em policies PUBLIC sem EXECUTE para anon → HTTP 500
  RETURN QUERY
  SELECT
    'FUNC_SEM_EXECUTE_ANON'::text,
    p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'::text,
    has_function_privilege('anon', p.oid, 'execute'),
    has_function_privilege('authenticated', p.oid, 'execute'),
    'CRITICAL'::text,
    'Função chamada em policy FOR PUBLIC mas anon não tem EXECUTE → HTTP 500'::text
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND NOT has_function_privilege('anon', p.oid, 'execute')
    AND has_function_privilege('authenticated', p.oid, 'execute')
    AND EXISTS (
      SELECT 1 FROM pg_policies pol
      WHERE pol.schemaname = 'public'
        AND (pol.roles @> ARRAY['public']::name[] OR pol.roles = '{}')
        AND (pol.qual || ' ' || coalesce(pol.with_check, ''))
            ILIKE '%' || p.proname || '%'
    )
  ORDER BY p.proname;

  -- C: Views sensíveis com acesso anon
  RETURN QUERY
  SELECT
    'VIEW_SENSIVEL_ANON'::text,
    c.relname::text,
    has_table_privilege('anon', c.oid, 'SELECT'),
    has_table_privilege('authenticated', c.oid, 'SELECT'),
    'HIGH'::text,
    'View interna acessível por anon — potencial data leak'::text
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('v', 'm')
    AND has_table_privilege('anon', c.oid, 'SELECT')
    AND c.relname IN (
      'bi_quotes_summary', 'ai_insights_cache',
      'v_monthly_costs', 'v_my_markup_config',
      'v_quote_seller_kpis', 'v_db_health_audit',
      'v_performance_dashboard', 'v_system_alerts',
      'v_system_health_dashboard', 'mv_product_images_audit',
      'v_slow_queries_analysis', 'v_system_health_dashboard'
    )
  ORDER BY c.relname;

  -- D: Tabelas críticas de badge sem GRANT SELECT para anon
  -- → provoca HTTP 403 quando useCloudStatus roda antes do JWT
  RETURN QUERY
  SELECT
    'BADGE_TABLE_SEM_ANON_GRANT'::text,
    t.tabela::text,
    has_table_privilege('anon', ('public.' || t.tabela)::regclass, 'SELECT'),
    has_table_privilege('authenticated', ('public.' || t.tabela)::regclass, 'SELECT'),
    'HIGH'::text,
    'Tabela usada em badge/count sem GRANT SELECT para anon → HTTP 403 no mount'::text
  FROM (VALUES
    ('discount_approval_requests'),
    ('workspace_notifications'),
    ('orders'),
    ('quotes'),
    ('search_analytics'),
    ('product_views')
  ) AS t(tabela)
  WHERE NOT has_table_privilege('anon', ('public.' || t.tabela)::regclass, 'SELECT')
  ORDER BY t.tabela;

END;
$$;

COMMENT ON FUNCTION public.fn_anon_access_audit() IS
  'Auditoria de acesso anon: detecta grants faltando, funções sem EXECUTE, '
  'views sensíveis expostas, tabelas de badge sem policy. '
  'Rodar após qualquer migração de schema ou adição de tabela nova.';

GRANT EXECUTE ON FUNCTION public.fn_anon_access_audit() TO authenticated;
;
