CREATE OR REPLACE FUNCTION public.fn_verify_anon_catalog_grants()
 RETURNS TABLE(object_name text, object_kind text, issue text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- (1) Views/tabelas que DEVEM ser legiveis por anon.
  --     v5: grant de COLUNA tambem conta (has_table_privilege ignora attacl).
  RETURN QUERY
  WITH req(sch, nm) AS (VALUES
    -- Views DEFINER (catalogo principal)
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
    -- Matview publica (as internas sairam na v5: ver bloco 8)
    ('public','mv_product_compositions'),
    -- Tabelas de catalogo (nao sensiveis)
    ('public','categories'),
    ('public','color_groups'),('public','color_synonym_map'),('public','color_variations'),
    ('public','kit_typical_dims'),
    ('public','material_types'),
    ('public','print_area_techniques'),
    ('public','product_attributes'),('public','product_badge_definitions'),
    ('public','product_commemorative_dates'),
    ('public','product_kit_components'),('public','product_materials'),
    ('public','product_novelties'),('public','product_physical'),
    ('public','product_variants'),
    ('public','produto_ramo_atividade'),('public','ramo_atividade'),
    ('public','ramo_atividade_filho'),('public','spot_typecode_map'),
    ('public','supplier_sub_brands'),
    ('public','tabela_preco_gravacao_oficial_faixa'),  -- faixa de preco de venda OK
    ('public','tecnicas_gravacao'),
    ('public','color_nuances'),('public','kit_component_print_areas'),
    ('public','personalization_techniques'),('public','product_properties'),
    ('public','tags'),('public','product_tags')
  )
  SELECT req.sch||'.'||req.nm, 'table/view'::text, 'FALTA anon SELECT'::text
  FROM req
  WHERE to_regclass(req.sch||'.'||req.nm) IS NULL
     OR NOT (
       has_table_privilege('anon', (req.sch||'.'||req.nm)::regclass, 'SELECT')
       OR EXISTS (
         SELECT 1 FROM pg_attribute a
         WHERE a.attrelid = (req.sch||'.'||req.nm)::regclass
           AND a.attnum > 0 AND NOT a.attisdropped
           AND has_column_privilege('anon', a.attrelid, a.attnum, 'SELECT')
       )
     );

  -- (2) Funcoes com anon EXECUTE obrigatorio
  --     v5: fn_global_search saiu (revogada de proposito em 20261119094500).
  RETURN QUERY
  SELECT 'public.'||v.fn, 'function'::text, 'FALTA anon EXECUTE'::text
  FROM (VALUES ('fn_super_filtro'),('fn_super_filtro_facets'),('fn_super_filtro_price_range'),
               ('get_catalog_bestseller_page'),
               ('fn_product_active_for_rls')) v(fn)  -- NOVO v3: exigido pelas policies de catalogo
  WHERE EXISTS (SELECT 1 FROM pg_proc WHERE proname=v.fn AND pronamespace='public'::regnamespace)
    AND NOT has_function_privilege('anon',
          (SELECT oid FROM pg_proc WHERE proname=v.fn AND pronamespace='public'::regnamespace LIMIT 1),'EXECUTE');

  -- (3) Tabelas SENSIVEIS que NAO podem ter anon SELECT
  RETURN QUERY
  SELECT 'public.'||v.nm, 'table'::text, 'VAZAMENTO: anon SELECT em tabela sensivel'::text
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

  -- (4) pg_stat_statements NAO pode ter anon SELECT (information disclosure de queries)
  RETURN QUERY
  SELECT 'extensions.pg_stat_statements', 'system_view'::text,
         'VAZAMENTO: anon le queries SQL internas'::text
  WHERE has_table_privilege('anon', 'extensions.pg_stat_statements'::regclass, 'SELECT');

  -- (5) Funcoes sensiveis que NAO devem ter anon EXECUTE
  RETURN QUERY
  SELECT 'public.get_promo_sales_ranking', 'function'::text,
         'VAZAMENTO: anon executa ranking de vendas'::text
  WHERE EXISTS (SELECT 1 FROM pg_proc WHERE proname='get_promo_sales_ranking' AND pronamespace='public'::regnamespace)
    AND has_function_privilege('anon',
          (SELECT oid FROM pg_proc WHERE proname='get_promo_sales_ranking' AND pronamespace='public'::regnamespace LIMIT 1),'EXECUTE');

  -- (5b) NOVO v5: fn_global_search — anon revogado de proposito (20261119094500:59).
  RETURN QUERY
  SELECT 'public.fn_global_search', 'function'::text,
         'VAZAMENTO: anon executa busca global (revogada em 20261119094500)'::text
  WHERE EXISTS (SELECT 1 FROM pg_proc WHERE proname='fn_global_search' AND pronamespace='public'::regnamespace)
    AND has_function_privilege('anon',
          (SELECT oid FROM pg_proc WHERE proname='fn_global_search' AND pronamespace='public'::regnamespace LIMIT 1),'EXECUTE');

  -- (6) Views criticas devem ser SECURITY DEFINER (security_invoker=false).
  --     v5: saem as 3 que sao invoker por decisao explicita (P06 20261117073000);
  --     elas passam para o bloco 9, no sentido correto.
  RETURN QUERY
  SELECT 'public.'||v.nm, 'view'::text, 'RISCO: view sensivel com security_invoker=true'::text
  FROM (VALUES ('v_products_public'),('v_suppliers_public'),
               ('v_variant_sale_prices_public'),
               ('v_tabela_preco_gravacao_oficial_public'),  -- NOVO v3
               ('v_kit_component_media_public'),
               ('v_product_compositions_public')) v(nm)
  WHERE to_regclass('public.'||v.nm) IS NOT NULL
    AND COALESCE((SELECT option_value FROM pg_options_to_table(
        (SELECT reloptions FROM pg_class WHERE relname=v.nm AND relnamespace='public'::regnamespace))
      WHERE option_name='security_invoker'), 'false') = 'true';

  -- (7) product_variants anon deve ter politica com is_active filter
  RETURN QUERY
  SELECT 'public.product_variants', 'rls_policy'::text,
         'RISCO: politica anon sem filtro is_active (202 variantes inativas expostas)'::text
  WHERE EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='product_variants'
      AND cmd IN ('SELECT','ALL')
      AND 'anon'=ANY(roles)
      AND qual='true'
  );

  -- (8) NOVO v5: objetos que NAO podem ser legiveis por anon de forma alguma
  --     (tabela OU coluna). Saíram do bloco (1) porque o fechamento foi decidido:
  --       mockup_approval_links      -> 20261008230000
  --       internal/analytics matviews -> leitura so por views DEFINER
  RETURN QUERY
  WITH fechado(sch, nm) AS (VALUES
    ('public','mockup_approval_links'),
    ('internal','mv_product_leaf_category'),
    ('analytics','mv_product_compositions')
  )
  SELECT fechado.sch||'.'||fechado.nm, 'table/view'::text,
         'VAZAMENTO: anon voltou a ler objeto fechado por decisao'::text
  FROM fechado
  WHERE to_regclass(fechado.sch||'.'||fechado.nm) IS NOT NULL
    AND (has_table_privilege('anon', (fechado.sch||'.'||fechado.nm)::regclass, 'SELECT')
         OR EXISTS (
           SELECT 1 FROM pg_attribute a
           WHERE a.attrelid = (fechado.sch||'.'||fechado.nm)::regclass
             AND a.attnum > 0 AND NOT a.attisdropped
             AND has_column_privilege('anon', a.attrelid, a.attnum, 'SELECT')
         ));

  -- (9) NOVO v5: views de catalogo que DEVEM ser security_invoker=true.
  --     Com invoker=true elas respeitam as policies das tabelas-base (P06,
  --     20261117073000) e dependem de anon EXECUTE em fn_product_active_for_rls
  --     (garantido pelo bloco 2). Voltar para definer re-expoe a base mascarada.
  RETURN QUERY
  SELECT 'public.'||v.nm, 'view'::text,
         'RISCO: view de catalogo invoker-by-design voltou a definer (re-expoe RLS)'::text
  FROM (VALUES ('v_kit_component_print_areas_public'),
               ('v_product_properties_public'),('v_product_tags_public')) v(nm)
  WHERE to_regclass('public.'||v.nm) IS NOT NULL
    AND COALESCE((SELECT option_value FROM pg_options_to_table(
        (SELECT reloptions FROM pg_class WHERE relname=v.nm AND relnamespace='public'::regnamespace))
      WHERE option_name='security_invoker'), 'false') <> 'true';
END $function$
