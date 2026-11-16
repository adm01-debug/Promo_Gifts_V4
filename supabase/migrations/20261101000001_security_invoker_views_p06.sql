-- Migration: 20261101000001_security_invoker_views_p06.sql
-- FASE B — P06: Adicionar security_invoker=true em 8 views (A-V01 | MÉDIO)
-- Aprovado pelo PO (PR #2443 mergeada 2026-10-26 + autorização 2026-11-01)
-- NÃO INCLUI v_variant_sale_prices_public: markup_configurations sem policy anon (quebraria preços públicos)
-- ROLLBACK: ALTER VIEW public.v_products_public RESET (security_invoker); -- repetir para cada view

ALTER VIEW public.v_kit_component_media_public SET (security_invoker = true);
ALTER VIEW public.v_product_compositions_public SET (security_invoker = true);
ALTER VIEW public.v_product_properties_public SET (security_invoker = true);
ALTER VIEW public.v_product_tags_public SET (security_invoker = true);
ALTER VIEW public.v_products_public SET (security_invoker = true);
ALTER VIEW public.v_suppliers_public SET (security_invoker = true);
ALTER VIEW public.v_system_health_dashboard SET (security_invoker = true);
ALTER VIEW public.v_tabela_preco_gravacao_oficial_public SET (security_invoker = true);
