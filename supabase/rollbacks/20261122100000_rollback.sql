-- Rollback da migration 20261122100000_compras_views_canonicas
--
-- Remove as tres views criadas pela migration. Como a migration apenas criou
-- objetos novos (nenhuma coluna/tabela alterada), o rollback e totalmente seguro:
-- as views anteriores voltam a nao existir, que era o estado real de producao
-- antes desta migration (v_compras_catalogo e v_compras_precos_faixa nunca
-- haviam sido aplicadas).
--
-- ATENCAO: o Promo Supply V2 (external-db-bridge) deixara de enxergar o catalogo.

drop view if exists public.v_compras_precos_variante;
drop view if exists public.v_compras_precos_faixa;
drop view if exists public.v_compras_catalogo;