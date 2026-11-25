-- Rollback: 20261125131000_tripwire_anon_v5_reconcilia.sql
-- ============================================================================
-- Volta o tripwire para a v4 e REVOGA o EXECUTE de anon em
-- public.fn_product_active_for_rls(uuid) — restaura exatamente o estado medido
-- antes desta migration (2026-11-25 13:0x UTC).
--
-- ATENCAO (efeito colateral conhecido e medido): depois deste rollback,
--   public.v_product_properties_public e public.v_product_tags_public respondem
--   401 para anon ("permission denied for function fn_product_active_for_rls") e
--   public.fn_verify_anon_catalog_grants() volta a acusar 11 achados
--   (2 FALTA anon EXECUTE + 6 FALTA anon SELECT por grant de coluna + 3 views
--   invoker-by-design). Rollback so por decisao explicita.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.fn_product_active_for_rls(uuid) FROM anon;
CREATE OR REPLACE FUNCTION public.fn_verify_anon_catalog_grants()
RETURNS TABLE(object_name text, object_kind text, issue text)
LANGUAGE plpgsql
SECURITY DEFINER
-- pg_temp por ultimo: fecha o vetor de shadowing que o preflight (--require-live) acusou.
SET search_path TO 'public', 'pg_temp'
AS $fn$
BEGIN
  -- (1) Views/tabelas que DEVEM ter anon SELECT (v4: sem as 13 revogadas na 20261125120000)
  RETURN QUERY
  WITH req(sch, nm) AS (VALUES
    -- Views DEFINER (catálogo principal)
    ('public','v_products_public'),('public','v_suppliers_public'),
    ('public','v_variant_sale_prices_public'),
    ('public','v_tabela_preco_gravacao_oficial_public'),
    -- 9 views _public
    ('public','v_color_nuances_public'),('public','v_kit_component_media_public'),
    ('public','v_kit_component_print_areas_public'),
    ('public','v_personalization_techniques_public'),
    ('public','v_print_area_techniques_public'),('public','v_product_compositions_public'),
    ('public','v_product_properties_public'),('public','v_product_tags_public'),
    ('public','v_tags_public'),
    -- Matviews cross-schema
    ('public','mv_product_compositions'),
    ('internal','mv_product_leaf_category'),('analytics','mv_product_compositions'),
    -- Tabelas de catálogo (não sensíveis)
    ('public','categories'),
    ('public','color_groups'),('public','color_synonym_map'),('public','color_variations'),
    ('public','kit_typical_dims'),
    ('public','material_types'),('public','mockup_approval_links'),
    ('public','print_area_techniques'),
    ('public','product_attributes'),('public','product_badge_definitions'),
    ('public','product_commemorative_dates'),
    ('public','product_kit_components'),('public','product_materials'),
    ('public','product_novelties'),('public','product_physical'),
    ('public','product_variants'),
    ('public','produto_ramo_atividade'),('public','ramo_atividade'),
    ('public','ramo_atividade_filho'),('public','spot_typecode_map'),
    ('public','supplier_sub_brands'),
    ('public','tabela_preco_gravacao_oficial_faixa'),  -- faixa de preço de venda OK
    ('public','tecnicas_gravacao'),
    ('public','color_nuances'),('public','kit_component_print_areas'),
    ('public','personalization_techniques'),('public','product_properties'),
    ('public','tags'),('public','product_tags')
  )
  SELECT req.sch||'.'||req.nm, 'table/view'::text, 'FALTA anon SELECT'::text
  FROM req
  WHERE to_regclass(req.sch||'.'||req.nm) IS NULL
     OR NOT has_table_privilege('anon', (req.sch||'.'||req.nm)::regclass, 'SELECT');

  -- (2) Funções com anon EXECUTE obrigatório
  RETURN QUERY
  SELECT 'public.'||v.fn, 'function'::text, 'FALTA anon EXECUTE'::text
  FROM (VALUES ('fn_super_filtro'),('fn_super_filtro_facets'),('fn_super_filtro_price_range'),
               ('fn_global_search'),('get_catalog_bestseller_page'),
               ('fn_product_active_for_rls')) v(fn)  -- NOVO v3
  WHERE EXISTS (SELECT 1 FROM pg_proc WHERE proname=v.fn AND pronamespace='public'::regnamespace)
    AND NOT has_function_privilege('anon',
          (SELECT oid FROM pg_proc WHERE proname=v.fn AND pronamespace='public'::regnamespace LIMIT 1),'EXECUTE');

  -- (3) Tabelas SENSÍVEIS que NÃO podem ter anon SELECT
  RETURN QUERY
  SELECT 'public.'||v.nm, 'table'::text, 'VAZAMENTO: anon SELECT em tabela sensível'::text
  FROM (VALUES ('variant_supplier_sources'),('markup_configurations'),('user_organizations'),
               ('quotes'),('quote_items'),
               ('products'),('suppliers'),   -- custo/credenciais
               ('tabela_preco_gravacao_oficial'),  -- NOVO v3: custo_setup/markup
               -- v4 (migration 20261125120000, QA etapa 008): grant herdado do legado
               -- revogado em 2026-11-25. Baseline medido em .security/anon-tables-baseline.json
               -- (2026-11-24) marcava as 13 como 'interno-grant-herdado'. Reaparecer aqui = regressao.
               ('collection_products'),('collections'),('content_articles'),
               ('favorite_item_reactions'),('favorite_items'),('favorite_lists'),
               ('product_ai_content'),('product_fiscal'),('product_seo'),
               ('product_supply'),('system_kill_switches'),('system_settings'),
               ('video_sim_results'))
             v(nm)
  WHERE to_regclass('public.'||v.nm) IS NOT NULL
    AND has_table_privilege('anon', ('public.'||v.nm)::regclass, 'SELECT');

  -- (4) pg_stat_statements NÃO pode ter anon SELECT (information disclosure de queries)
  RETURN QUERY
  SELECT 'extensions.pg_stat_statements', 'system_view'::text,
         'VAZAMENTO: anon lê queries SQL internas'::text
  WHERE has_table_privilege('anon', 'extensions.pg_stat_statements'::regclass, 'SELECT');

  -- (5) Funções sensíveis que NÃO devem ter anon EXECUTE
  RETURN QUERY
  SELECT 'public.get_promo_sales_ranking', 'function'::text,
         'VAZAMENTO: anon executa ranking de vendas'::text
  WHERE EXISTS (SELECT 1 FROM pg_proc WHERE proname='get_promo_sales_ranking' AND pronamespace='public'::regnamespace)
    AND has_function_privilege('anon',
          (SELECT oid FROM pg_proc WHERE proname='get_promo_sales_ranking' AND pronamespace='public'::regnamespace LIMIT 1),'EXECUTE');

  -- (6) Views críticas devem ser SECURITY DEFINER (security_invoker=false)
  RETURN QUERY
  SELECT 'public.'||v.nm, 'view'::text, 'RISCO: view sensível com security_invoker=true'::text
  FROM (VALUES ('v_products_public'),('v_suppliers_public'),
               ('v_variant_sale_prices_public'),
               ('v_tabela_preco_gravacao_oficial_public'),  -- NOVO v3
               ('v_kit_component_media_public'),('v_kit_component_print_areas_public'),
               ('v_product_compositions_public'),('v_product_properties_public'),
               ('v_product_tags_public')) v(nm)
  WHERE to_regclass('public.'||v.nm) IS NOT NULL
    AND COALESCE((SELECT option_value FROM pg_options_to_table(
        (SELECT reloptions FROM pg_class WHERE relname=v.nm AND relnamespace='public'::regnamespace))
      WHERE option_name='security_invoker'), 'false') = 'true';

  -- (7) NOVO v3: product_variants anon deve ter política com is_active filter
  RETURN QUERY
  SELECT 'public.product_variants', 'rls_policy'::text,
         'RISCO: política anon sem filtro is_active (202 variantes inativas expostas)'::text
  WHERE EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='product_variants'
      AND cmd IN ('SELECT','ALL')
      AND 'anon'=ANY(roles)
      AND qual='true'
  );
END $fn$;

COMMENT ON FUNCTION public.fn_verify_anon_catalog_grants() IS
  'Tripwire anti-regressao v3 (fix_version 20260717). Cobre: 56+ objetos obrigatórios, '
  '8 travas de sensíveis (products/suppliers/tabela_gravacao/pg_stat_statements), '
  '6 RPCs (5 seguros + fn_product_active_for_rls), 9 views DEFINER, '
  'produto_variants is_active policy. 0 linhas = saudável.';

DO $verify$
BEGIN
  IF has_function_privilege('anon', 'public.fn_product_active_for_rls(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'rollback incompleto: anon ainda executa fn_product_active_for_rls';
  END IF;
  RAISE NOTICE 'rollback 20261125131000: tripwire v4 restaurado, EXECUTE de anon revogado (% achado(s) esperado(s): 11)', (SELECT count(*) FROM public.fn_verify_anon_catalog_grants());
END
$verify$;

