-- ============================================================
-- FIX P1: Restaura GRANT SELECT p/ anon nas tabelas de catálogo/
-- referência que JÁ possuem política RLS PERMISSIVE explícita para
-- anon (X_public_read / X_anon_select / *_anon_read etc.). O grant
-- foi removido na mesma regressão das views; as políticas ficaram
-- "mortas" (RLS permite anon, mas o privilégio — checado ANTES —
-- estava ausente => 42501/403 em páginas de produto, filtros, cores,
-- kits, técnicas, badges, favoritos compartilhados, coleções etc.).
--
-- ESCOPO: SOMENTE tabelas com política anon PERMISSIVE de verdade
-- (qual <> false). NÃO inclui:
--   * tabelas *_deny / rls_infra_deny_public / li_deny_anon (DENY);
--   * tabelas admin_only / infra / backups (service_role apenas);
--   * views _public com deps sensíveis (markup_configurations,
--     variant_supplier_sources) — tratadas à parte.
-- authenticated já possuía SELECT nestas tabelas (sem lacuna).
-- fix_version: 20260717_grants_anon_catalog_v1
-- ============================================================

GRANT SELECT ON
  public.categories,
  public.collection_products,
  public.collections,
  public.color_groups,
  public.color_synonym_map,
  public.color_variations,
  public.content_articles,
  public.favorite_item_reactions,
  public.favorite_items,
  public.favorite_lists,
  public.kit_typical_dims,
  public.material_types,
  public.mockup_approval_links,
  public.print_area_techniques,
  public.product_ai_content,
  public.product_attributes,
  public.product_badge_definitions,
  public.product_commemorative_dates,
  public.product_fiscal,
  public.product_kit_components,
  public.product_materials,
  public.product_novelties,
  public.product_physical,
  public.product_seo,
  public.product_supply,
  public.product_variants,
  public.produto_ramo_atividade,
  public.ramo_atividade,
  public.ramo_atividade_filho,
  public.spot_typecode_map,
  public.supplier_sub_brands,
  public.system_kill_switches,
  public.tabela_preco_gravacao_oficial,
  public.tabela_preco_gravacao_oficial_faixa,
  public.tecnicas_gravacao,
  public.video_sim_results
TO anon;

NOTIFY pgrst, 'reload schema';;
