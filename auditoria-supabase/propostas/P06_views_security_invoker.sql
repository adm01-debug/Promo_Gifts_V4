-- P06: Adicionar security_invoker=true nas views sem essa opção
-- Achado: A-V01 (MÉDIO)
-- NÃO APLICAR DIRETAMENTE — usar workflow db-apply-migration.yml
--
-- PROBLEMA: 9 views executam como owner (postgres) em vez de como
-- o usuário que chama (invoker). Isso pode contornar RLS para papel anon.
--
-- VIEWS AFETADAS:
-- v_kit_component_media_public, v_product_compositions_public,
-- v_product_properties_public, v_product_tags_public,
-- v_products_public (*ALTO*), v_suppliers_public,
-- v_system_health_dashboard (*ALTO*),
-- v_tabela_preco_gravacao_oficial_public, v_variant_sale_prices_public
--
-- PRÉ-REQUISITO: Antes de aplicar, testar em staging que as views
-- ainda retornam dados corretos com security_invoker=true.
-- Views com security_invoker=true aplicam RLS das tabelas subjacentes
-- ao papel do chamador — pode restringir dados que antes eram visíveis.
--
-- TESTE SUGERIDO (em ambiente não-produção):
-- SET ROLE anon;
-- SELECT COUNT(*) FROM v_products_public;
-- RESET ROLE;

-- === MIGRATION ===

/*
-- Cada ALTER VIEW recria a view com a nova opção.
-- Verificar a definição atual antes: SELECT definition FROM pg_views WHERE viewname = '...';

ALTER VIEW public.v_products_public SET (security_invoker = true);
ALTER VIEW public.v_system_health_dashboard SET (security_invoker = true);
ALTER VIEW public.v_suppliers_public SET (security_invoker = true);
ALTER VIEW public.v_kit_component_media_public SET (security_invoker = true);
ALTER VIEW public.v_product_compositions_public SET (security_invoker = true);
ALTER VIEW public.v_product_properties_public SET (security_invoker = true);
ALTER VIEW public.v_product_tags_public SET (security_invoker = true);
ALTER VIEW public.v_tabela_preco_gravacao_oficial_public SET (security_invoker = true);
ALTER VIEW public.v_variant_sale_prices_public SET (security_invoker = true);
*/

-- === VERIFICAÇÃO ===
/*
SELECT relname, reloptions
FROM pg_class
WHERE relkind = 'v'
  AND relnamespace = 'public'::regnamespace
  AND relname IN (
    'v_products_public', 'v_system_health_dashboard', 'v_suppliers_public',
    'v_kit_component_media_public', 'v_product_compositions_public',
    'v_product_properties_public', 'v_product_tags_public',
    'v_tabela_preco_gravacao_oficial_public', 'v_variant_sale_prices_public'
  );
-- Esperado: reloptions contém 'security_invoker=true' em todas
*/

-- === ROLLBACK ===
/*
ALTER VIEW public.v_products_public RESET (security_invoker);
ALTER VIEW public.v_system_health_dashboard RESET (security_invoker);
-- ... demais views
*/
