-- ============================================================================
-- fix_version: 20260717_fn_verify_anon_catalog_grants_v1
-- Tripwire anti-regressão: valida o baseline de acesso anônimo do catálogo.
-- Retorna SOMENTE violações (0 linhas = saudável). Rodar manual ou via cron.
-- Cobre: grants obrigatórios (RPCs + tabelas/views + matviews cross-schema) e
--        travas obrigatórias (objetos sensíveis que NÃO podem ter acesso anon).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_verify_anon_catalog_grants()
RETURNS TABLE(object_name text, object_kind text, issue text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  -- (1) Tabelas/Views que DEVEM ter anon SELECT
  RETURN QUERY
  WITH req(sch, nm) AS (VALUES
    ('public','products'),('public','suppliers'),('public','v_products_public'),('public','v_suppliers_public'),
    ('public','categories'),('public','collection_products'),('public','collections'),('public','color_groups'),
    ('public','color_synonym_map'),('public','color_variations'),('public','content_articles'),
    ('public','favorite_item_reactions'),('public','favorite_items'),('public','favorite_lists'),
    ('public','kit_typical_dims'),('public','material_types'),('public','mockup_approval_links'),
    ('public','print_area_techniques'),('public','product_ai_content'),('public','product_attributes'),
    ('public','product_badge_definitions'),('public','product_commemorative_dates'),('public','product_fiscal'),
    ('public','product_kit_components'),('public','product_materials'),('public','product_novelties'),
    ('public','product_physical'),('public','product_seo'),('public','product_supply'),('public','product_variants'),
    ('public','produto_ramo_atividade'),('public','ramo_atividade'),('public','ramo_atividade_filho'),
    ('public','spot_typecode_map'),('public','supplier_sub_brands'),('public','system_kill_switches'),
    ('public','tabela_preco_gravacao_oficial'),('public','tabela_preco_gravacao_oficial_faixa'),
    ('public','tecnicas_gravacao'),('public','video_sim_results'),
    ('public','color_nuances'),('public','kit_component_print_areas'),('public','personalization_techniques'),
    ('public','product_properties'),('public','tags'),('public','product_tags'),
    ('public','v_color_nuances_public'),('public','v_kit_component_media_public'),
    ('public','v_kit_component_print_areas_public'),('public','v_personalization_techniques_public'),
    ('public','v_print_area_techniques_public'),('public','v_product_compositions_public'),
    ('public','v_product_properties_public'),('public','v_product_tags_public'),('public','v_tags_public'),
    ('public','v_variant_sale_prices_public'),('public','mv_product_compositions'),
    ('internal','mv_product_leaf_category'),('analytics','mv_product_compositions')
  )
  SELECT req.sch||'.'||req.nm, 'table/view'::text, 'FALTA anon SELECT (read-path quebrado)'::text
  FROM req
  WHERE to_regclass(req.sch||'.'||req.nm) IS NULL
     OR NOT has_table_privilege('anon', (req.sch||'.'||req.nm)::regclass, 'SELECT');

  -- (2) Funções que DEVEM ter anon EXECUTE
  RETURN QUERY
  SELECT 'public.'||v.fn, 'function'::text, 'FALTA anon EXECUTE'::text
  FROM (VALUES ('fn_super_filtro'),('fn_super_filtro_facets'),('fn_super_filtro_price_range'),
               ('fn_global_search'),('get_catalog_bestseller_page')) v(fn)
  WHERE EXISTS (SELECT 1 FROM pg_proc WHERE proname=v.fn AND pronamespace='public'::regnamespace)
    AND NOT has_function_privilege('anon',
          (SELECT oid FROM pg_proc WHERE proname=v.fn AND pronamespace='public'::regnamespace LIMIT 1),'EXECUTE');

  -- (3) Tabelas SENSÍVEIS que NÃO podem ter acesso anon
  RETURN QUERY
  SELECT 'public.'||v.nm, 'table'::text, 'VAZAMENTO: anon tem SELECT em tabela sensível'::text
  FROM (VALUES ('variant_supplier_sources'),('markup_configurations'),('user_organizations'),
               ('quotes'),('quote_items')) v(nm)
  WHERE to_regclass('public.'||v.nm) IS NOT NULL
    AND has_table_privilege('anon', ('public.'||v.nm)::regclass, 'SELECT');

  -- (4) Função sensível que NÃO pode ter anon EXECUTE
  RETURN QUERY
  SELECT 'public.get_promo_sales_ranking', 'function'::text, 'VAZAMENTO: anon pode executar ranking de vendas'::text
  WHERE EXISTS (SELECT 1 FROM pg_proc WHERE proname='get_promo_sales_ranking' AND pronamespace='public'::regnamespace)
    AND has_function_privilege('anon',
          (SELECT oid FROM pg_proc WHERE proname='get_promo_sales_ranking' AND pronamespace='public'::regnamespace LIMIT 1),'EXECUTE');
END $fn$;

COMMENT ON FUNCTION public.fn_verify_anon_catalog_grants() IS
  'Tripwire anti-regressao do read-path anonimo do catalogo (fix_version 20260717_v1). '
  'Retorna somente violacoes; 0 linhas = saudavel. Rodar apos deploys/sweeps de advisor.';;
