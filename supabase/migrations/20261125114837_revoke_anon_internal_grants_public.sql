-- Migration: 20261125114837_revoke_anon_internal_grants_public.sql
-- Rollback: supabase/rollbacks/20261125114837_rollback.sql
--
-- QA etapa 008: fecha as 13 tabelas de `public` que o role `anon` ainda le por GRANT de SELECT
-- herdado do legado (fora do repo), sem nenhum consumidor anonimo.
--
-- Origem da lista: `.security/anon-tables-baseline.json` (medicao de 2026-11-24, mergeada em #4059),
-- que classifica 42 tabelas legiveis por `anon` em 25 `catalogo-publico`, 4 `catalogo-publico-por-coluna`
-- e **13 `interno-grant-herdado`** ? estas ultimas registradas com a nota "a revogacao e a etapa 008 do
-- QA docs/qa/05-PROGRESSO.md". `docs/qa/05-PROGRESSO.md` (secao "Etapa 008") repete o mesmo numero.
--
-- Estado medido (PostgREST com a chave publicavel do bundle, 2026-11-24):
--   * 12 das 13 devolvem 200 com count 0 ? a RLS nao tem policy de SELECT para `anon`, entao o grant e
--     vestigial: nada que hoje funciona depende dele;
--   * `video_sim_results` devolve 200 com **1007 linhas** ? resultado de simulacao de video e dado
--     interno, sem consumidor publico conhecido: vazamento efetivo, nao apenas grant orfao.
--
-- Por que revogar em vez de deixar como esta: grant de tabela e um contrato latente. Qualquer policy de
-- SELECT futura nessas tabelas passa a entregar a tabela inteira ao anonimo sem novo grant, e o gate
-- E118i so acusa a existencia do grant, nao o uso.
--
-- O que NAO muda (verificado no codigo):
--   * `authenticated` e `service_role` mantem SELECT (post-check aborta a transacao se perderem):
--     favoritos (`src/hooks/favorites/useFavoriteLists.ts`, `useFavoriteQuickAdd.ts`), colecoes
--     (`src/hooks/collections/useCollections.ts`) e o painel de kill switches
--     (`src/lib/external-db/kill-switch-client.ts`) seguem intactos;
--   * `system_settings`: o unico leitor anonimo e `src/components/providers/AppBootstrap.tsx`
--     (maintenance_mode). Ali `if (error) { logger.error(...); return; }` deixa `maintenanceMode` em
--     `false` ? exatamente o que ja acontece hoje, quando a RLS devolve 0 linha. Troca "lista vazia"
--     por "sem privilegio", mesmo resultado visivel;
--   * nenhuma migration re-concede estes 13 a `anon` depois desta (ultima que concedia era o dump do
--     legado; as de 2026-11-24 so revogam).
--
-- Tripwire: `fn_verify_anon_catalog_grants()` v4 troca as 12 tabelas da lista "DEVEM ter anon SELECT"
-- para a lista "NAO podem ter anon SELECT" (junto com `system_settings`, que nunca esteve la). Reaparecer
-- grant em qualquer uma das 13 passa a ser acusado pela auditoria agendada
-- (`20260717144811_schedule_anon_catalog_grant_audit_v1.sql`) em vez de passar em silencio.
--
-- Nota operacional: este repo compara `.security/anon-tables-baseline.json` com o banco AO VIVO
-- (`scripts/check-public-views-drift.mjs --require-live`). Depois que esta migration for aplicada, as 13
-- entradas da baseline passam a ser "entrada sem efeito" e o gate fica vermelho ate serem removidas ?
-- a remocao e uma PR de follow-up obrigatoria (13 linhas), nao pode vir antes, senao o mesmo gate fica
-- vermelho pelo motivo inverso ("SELECT de anon sem entrada").

DO $revoke$
DECLARE
  v_tables text[] := ARRAY[
    'collections',
    'collection_products',
    'content_articles',
    'favorite_item_reactions',
    'favorite_items',
    'favorite_lists',
    'product_ai_content',
    'product_fiscal',
    'product_seo',
    'product_supply',
    'system_kill_switches',
    'system_settings',
    'video_sim_results'
  ];
  v_name text;
  v_left text[] := '{}';
  v_n int := 0;
BEGIN
  FOREACH v_name IN ARRAY v_tables LOOP
    IF to_regclass('public.' || v_name) IS NULL THEN
      RAISE EXCEPTION 'tabela public.% nao existe: baseline e banco divergiram, revisar antes de revogar', v_name;
    END IF;

    IF has_table_privilege('anon', ('public.' || v_name)::regclass, 'SELECT') THEN
      EXECUTE format('REVOKE SELECT ON TABLE public.%I FROM anon', v_name);
      v_n := v_n + 1;
    END IF;

    IF has_table_privilege('anon', ('public.' || v_name)::regclass, 'SELECT') THEN
      v_left := v_left || v_name;
    END IF;

    IF NOT has_table_privilege('authenticated', ('public.' || v_name)::regclass, 'SELECT') THEN
      RAISE EXCEPTION 'authenticated perdeu SELECT em public.% - painel/feature quebraria', v_name;
    END IF;
  END LOOP;

  IF array_length(v_left, 1) > 0 THEN
    RAISE EXCEPTION 'anon ainda tem SELECT em: %', array_to_string(v_left, ', ');
  END IF;

  RAISE NOTICE 'ok: SELECT de anon revogado em % de % tabelas (as demais ja estavam limpas)', v_n, array_length(v_tables, 1);
END
$revoke$;

-- ---------------------------------------------------------------------------
-- Tripwire v4: as 13 saem da lista de obrigatorios e entram na de proibidos.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_verify_anon_catalog_grants()
RETURNS TABLE(object_name text, object_kind text, issue text)
LANGUAGE plpgsql
SECURITY DEFINER
-- pg_temp por último: fecha o vetor de shadowing que o preflight (--require-live) acusou.
SET search_path TO 'public', 'pg_temp'
AS $fn$
BEGIN
  -- (1) Views/tabelas que DEVEM ter anon SELECT (v4: sem as 13 revogadas na 20261125114837)
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
               -- v4 (migration 20261125114837, QA etapa 008): grant herdado do legado
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


-- ---------------------------------------------------------------------------
-- Post-check: nenhuma das 13 pode aparecer no tripwire (nem FALTA nem VAZAMENTO)
-- e o anon nao le mais nenhuma delas nem por coluna.
-- ---------------------------------------------------------------------------
DO $verify$
DECLARE
  v_tables text[] := ARRAY[
    'collections','collection_products','content_articles','favorite_item_reactions',
    'favorite_items','favorite_lists','product_ai_content','product_fiscal','product_seo',
    'product_supply','system_kill_switches','system_settings','video_sim_results'
  ];
  v_name text;
  v_bad text[] := '{}';
  v_col text;
BEGIN
  FOREACH v_name IN ARRAY v_tables LOOP
    IF EXISTS (
      SELECT 1 FROM public.fn_verify_anon_catalog_grants() f
      WHERE f.object_name = 'public.' || v_name
    ) THEN
      v_bad := v_bad || v_name;
    END IF;

    FOR v_col IN
      SELECT a.attname FROM pg_attribute a
      WHERE a.attrelid = ('public.' || v_name)::regclass
        AND a.attnum > 0 AND NOT a.attisdropped
        AND has_column_privilege('anon', a.attrelid, a.attnum, 'SELECT')
    LOOP
      RAISE EXCEPTION 'anon ainda le public.%.% por grant de coluna', v_name, v_col;
    END LOOP;
  END LOOP;

  IF array_length(v_bad, 1) > 0 THEN
    RAISE EXCEPTION 'tripwire ainda acusa as tabelas: %', array_to_string(v_bad, ', ');
  END IF;

  RAISE NOTICE 'ok: 13 tabelas fora do alcance do anon e tripwire v4 sem achado';
END
$verify$;
