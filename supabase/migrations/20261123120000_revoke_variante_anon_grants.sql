-- Migration: 20261123120000_revoke_variante_anon_grants.sql
-- Rollback: supabase/rollbacks/20261123120000_rollback.sql
--
-- QA Plano Etapa 004 (ACH-003/ACH-010) ? Revogar grant anon em v_compras_precos_variante
--
-- DECISAO TOMADA: Opcao 1 (revogar).
-- EVIDENCIA: Etapa 001 (commit da PR #4003) confirmou que useCatalogoPim.ts (Promo Supply V2)
-- invoca APENAS v_compras_catalogo e v_compras_precos_faixa. v_compras_precos_variante NAO
-- aparece em nenhuma chamada registrada no ultimo audit log. Sem chamada real = sem custo de
-- manter a superf?cie aberta.
--
-- O QUE FOI ABERTO PELA 20261122200000 (linhas 65-67):
--   grant select on variant_supplier_sources to anon;        -- linha 66
--   grant select on markup_configurations    to anon;        -- linha 67
--   grant select (default_markup_percent) on suppliers to anon; -- linha 68
--   (o grant em v_compras_precos_variante ja existia desde 20261122100000)
--
-- ESTA MIGRATION:
--   1. Revoga o grant de anon em v_compras_precos_variante.
--   2. Revoga os grants auxiliares abertos pela 20261122200000 em variant_supplier_sources,
--      markup_configurations e suppliers.default_markup_percent.
--   3. NAO mexe em vw_variant_sale_prices (permanece security_invoker=true + authenticated).
--
-- EFEITO FINAL: anon recebe 403 Forbidden ao tentar acessar v_compras_precos_variante.
-- Consumidores autenticados nao sao afetados (grant authenticated permanece via
-- v_compras_catalogo e v_compras_precos_faixa).

-- 1. Fechar a view ao anon
revoke select on public.v_compras_precos_variante from anon;

-- 2. Revogar os grants auxiliares abertos pela 20261122200000
revoke select on public.variant_supplier_sources from anon;
revoke select on public.markup_configurations from anon;
revoke select (default_markup_percent) on public.suppliers from anon;
