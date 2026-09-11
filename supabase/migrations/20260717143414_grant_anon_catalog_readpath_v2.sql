-- ============================================================================
-- fix_version: 20260717_grant_anon_catalog_readpath_v2
-- P0: restaura o read-path anônimo do catálogo (storefront deslogado).
-- A campanha de hardening revogou anon em massa; políticas RLS anon sobreviveram,
-- só faltavam os GRANTs. Aplicado via apply_migration (durável; execute_sql NAO persistiu).
-- ANTI-REGRESSAO: se um bot/migração revogar, RE-CONCEDER este conjunto.
-- ============================================================================

-- Schema internal (matview de folha de categoria consumida por v_products_public;
-- PostgREST não expõe 'internal', então o grant só habilita a leitura interna da view)
GRANT USAGE  ON SCHEMA internal                   TO anon;
GRANT SELECT ON internal.mv_product_leaf_category TO anon;

-- Núcleo P0
GRANT SELECT ON public.products            TO anon;
GRANT SELECT ON public.suppliers           TO anon;
GRANT SELECT ON public.v_products_public   TO anon;
GRANT SELECT ON public.v_suppliers_public  TO anon;

-- 36 tabelas de catálogo (todas possuem política PERMISSIVE anon SELECT sobrevivente)
GRANT SELECT ON public.categories                          TO anon;
GRANT SELECT ON public.collection_products                 TO anon;
GRANT SELECT ON public.collections                         TO anon;
GRANT SELECT ON public.color_groups                        TO anon;
GRANT SELECT ON public.color_synonym_map                   TO anon;
GRANT SELECT ON public.color_variations                    TO anon;
GRANT SELECT ON public.content_articles                    TO anon;
GRANT SELECT ON public.favorite_item_reactions             TO anon;
GRANT SELECT ON public.favorite_items                      TO anon;
GRANT SELECT ON public.favorite_lists                      TO anon;
GRANT SELECT ON public.kit_typical_dims                    TO anon;
GRANT SELECT ON public.material_types                      TO anon;
GRANT SELECT ON public.mockup_approval_links               TO anon;
GRANT SELECT ON public.print_area_techniques               TO anon;
GRANT SELECT ON public.product_ai_content                  TO anon;
GRANT SELECT ON public.product_attributes                  TO anon;
GRANT SELECT ON public.product_badge_definitions           TO anon;
GRANT SELECT ON public.product_commemorative_dates         TO anon;
GRANT SELECT ON public.product_fiscal                      TO anon;
GRANT SELECT ON public.product_kit_components              TO anon;
GRANT SELECT ON public.product_materials                   TO anon;
GRANT SELECT ON public.product_novelties                   TO anon;
GRANT SELECT ON public.product_physical                    TO anon;
GRANT SELECT ON public.product_seo                         TO anon;
GRANT SELECT ON public.product_supply                      TO anon;
GRANT SELECT ON public.product_variants                    TO anon;
GRANT SELECT ON public.produto_ramo_atividade              TO anon;
GRANT SELECT ON public.ramo_atividade                      TO anon;
GRANT SELECT ON public.ramo_atividade_filho                TO anon;
GRANT SELECT ON public.spot_typecode_map                   TO anon;
GRANT SELECT ON public.supplier_sub_brands                 TO anon;
GRANT SELECT ON public.system_kill_switches                TO anon;
GRANT SELECT ON public.tabela_preco_gravacao_oficial       TO anon;
GRANT SELECT ON public.tabela_preco_gravacao_oficial_faixa TO anon;
GRANT SELECT ON public.tecnicas_gravacao                   TO anon;
GRANT SELECT ON public.video_sim_results                   TO anon;

NOTIFY pgrst, 'reload schema';;
