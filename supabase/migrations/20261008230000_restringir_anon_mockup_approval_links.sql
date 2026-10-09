-- ============================================================================
-- fix_version: 20261008_restringir_anon_mockup_approval_links
-- Plano Mockup (etapas 1-2) — aprovada pelo dono em 08/10/2026.
--
-- (1) anon deixa de ler mockup_approval_links. A tabela guarda public_token e client_notes; a migration
--     20260717143414_grant_anon_catalog_readpath_v2 concedeu SELECT ao anon junto de 36 tabelas de catalogo
--     (e a politica mal_public_select_active deixa ler TODAS as linhas com is_active = true). Nenhum codigo
--     (src/ ou functions) usa essa tabela como anon. O link publico de aprovacao do cliente (futuro) deve usar
--     uma funcao segura que busca UMA linha pelo token, nunca SELECT direto.
--     ATENCAO: aquela migration pede RE-CONCEDER se algo revogar. Aqui a revogacao e INTENCIONAL; por isso a funcao
--     tripwire fn_verify_anon_catalog_grants e recriada (v4) sem esta tabela.
-- (2) bucket mockup-assets: a politica de listagem (storage.objects) era sempre verdadeira (name IS NOT NULL);
--     passa a listar so a propria pasta <uid>/...  (getPublicUrl nao depende desta politica).
--
-- ROLLBACK (restaura o estado anterior, GRANTs exatamente como no SCHEMA_LIVE):
--   DROP POLICY IF EXISTS "Authenticated users can view mockup assets" ON storage.objects;
--   CREATE POLICY "Authenticated users can view mockup assets" ON storage.objects FOR SELECT TO authenticated
--     USING ((bucket_id = 'mockup-assets'::text) AND (name IS NOT NULL) AND (length(name) > 0));
--   GRANT SELECT, INSERT, REFERENCES, DELETE, TRIGGER, MAINTAIN, UPDATE ON TABLE public.mockup_approval_links TO anon;
--   CREATE POLICY "mal_public_select_active" ON public.mockup_approval_links FOR SELECT TO anon USING (is_active = true);
--   (e reaplicar a funcao fn_verify_anon_catalog_grants da migration 20260717173510)
-- ============================================================================

-- (1) links de aprovacao: fim do acesso anonimo
DROP POLICY IF EXISTS "mal_public_select_active" ON public.mockup_approval_links;
REVOKE ALL ON TABLE public.mockup_approval_links FROM anon;

-- (2) listagem do bucket mockup-assets: so a propria pasta
DROP POLICY IF EXISTS "Authenticated users can view mockup assets" ON storage.objects;
CREATE POLICY "Authenticated users can view mockup assets" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'mockup-assets'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- (3) tripwire v4 (sem a tabela revogada)
-- ============================================================================
-- fix_version: 20261008_fn_verify_anon_catalog_grants_v4
-- v4 (08/10/2026): mockup_approval_links SAIU da lista de tabelas anon obrigatórias (guarda public_token e client_notes; ver cabeçalho da migration de restrição).
-- (herdado) MELHORIA 5/6: Tripwire v3 — cobertura completa de todos os fixes desta sessão.
-- Adicionado: v_tabela_preco_gravacao_oficial_public, fn_product_active_for_rls EXECUTE,
-- pg_stat_statements bloqueado, tabela_preco_gravacao_oficial bloqueada,
-- product_variants_anon_read is_active check, 9 views DEFINER completas.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_verify_anon_catalog_grants()
RETURNS TABLE(object_name text, object_kind text, issue text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  -- (1) Views/tabelas que DEVEM ter anon SELECT
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
    ('public','categories'),('public','collection_products'),('public','collections'),
    ('public','color_groups'),('public','color_synonym_map'),('public','color_variations'),
    ('public','content_articles'),('public','favorite_item_reactions'),
    ('public','favorite_items'),('public','favorite_lists'),('public','kit_typical_dims'),
    ('public','material_types'),
    ('public','print_area_techniques'),('public','product_ai_content'),
    ('public','product_attributes'),('public','product_badge_definitions'),
    ('public','product_commemorative_dates'),('public','product_fiscal'),
    ('public','product_kit_components'),('public','product_materials'),
    ('public','product_novelties'),('public','product_physical'),('public','product_seo'),
    ('public','product_supply'),('public','product_variants'),
    ('public','produto_ramo_atividade'),('public','ramo_atividade'),
    ('public','ramo_atividade_filho'),('public','spot_typecode_map'),
    ('public','supplier_sub_brands'),('public','system_kill_switches'),
    ('public','tabela_preco_gravacao_oficial_faixa'),  -- faixa de preço de venda OK
    ('public','tecnicas_gravacao'),('public','video_sim_results'),
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
               ('tabela_preco_gravacao_oficial'))  -- NOVO v3: custo_setup/markup
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
  'Tripwire anti-regressao v4 (fix_version 20261008). Cobre: 56+ objetos obrigatórios, '
  '8 travas de sensíveis (products/suppliers/tabela_gravacao/pg_stat_statements), '
  '6 RPCs (5 seguros + fn_product_active_for_rls), 9 views DEFINER, '
  'produto_variants is_active policy. 0 linhas = saudável.';;
