-- Migration: 20261123100000_mask_cost_compras_catalogo.sql
-- Rollback: supabase/rollbacks/20261123100000_rollback.sql
--
-- QA Plano Etapa 002 (ACH-001) ? Mascarar cost_price e campos sensiveis em v_compras_catalogo
--
-- PROBLEMA HOJE (medido em 2026-11-22, auditoria QA commit ded84e9):
--   GET /rest/v1/v_compras_catalogo?select=*&limit=2 com a publishable key (anon)
--   retorna HTTP 200 com cost_price: 4.34, supplier_name, supplier_code,
--   supplier_reference, ipi_rate. Um concorrente calcula a margem do negocio em minutos.
--
-- CAUSA-RAIZ:
--   A view projeta cost_price sem mascara. O contrato publico do repo ja define
--   cost_price como campo mascarado (NULL) em v_products_public (desde 20260627155804).
--   O padr?o nao foi replicado quando as views de compras foram criadas.
--
-- DECISAO DE MASCARAMENTO (seguindo v_products_public como referencia):
--   cost_price       -> NULL::numeric  (custo de compra ? nunca exposto ao publico)
--   suggested_price  -> NULL::numeric  (derivado do custo ? expoe margem)
--   supplier_reference -> NULL::text   (referencia interna do fornecedor)
--   supplier_external_id -> NULL::text (ID externo do fornecedor ? PII operacional)
--
-- POR QUE NAO REVOGAR O GRANT DE ANON:
--   O consumidor externo Promo Supply V2 acessa via external-db-bridge com EXTERNAL_DB_KEY
--   (provavel anon key). Revogar derrubaria o bridge sem aviso. Mascarar mantem o contrato
--   de colunas intacto e elimina o dado sensivel ? solucao adotada em v_products_public.
--
-- IMPACTO NO PROMO SUPPLY V2:
--   useCatalogoPim.ts passara a receber cost_price=null e suggested_price=null.
--   O time do Supply V2 deve ser avisado antes do merge e, se precisar do custo,
--   deve trocar EXTERNAL_DB_KEY por uma credencial authenticated com role adequado.
--
-- SEGURANCA: security_invoker permanece FALSE. Ligar invoker nestas views quebra o anon
--   (medido em 20261122180000: 401 42501 sem grant na tabela-base).

create or replace view public.v_compras_catalogo
with (security_invoker = false) as
select
  p.id                              as pim_product_id,
  v.id                              as pim_variant_id,
  p.sku,
  p.sku_promo,
  p.name,
  p.supplier_id,
  s.code                            as supplier_code,
  s.name                            as supplier_name,
  NULL::text                        as supplier_reference,
  NULL::text                        as supplier_external_id,
  NULL::numeric                     as cost_price,
  p.sale_price,
  NULL::numeric                     as suggested_price,
  p.ipi_rate,
  p.ncm_code,
  p.min_quantity,
  p.min_order_quantity,
  s.min_order_value,
  coalesce(v.stock_quantity, p.stock_quantity) as stock_quantity,
  p.is_stockout,
  p.last_stock_update_at,
  p.xbz_stock_reliability_text,
  v.color_id,
  v.color_name,
  v.color_code,
  v.color_hex,
  v.size_code,
  coalesce(p.primary_image_url, p.primary_image_fallback_url) as image_url,
  p.lead_time_days,
  p.price_updated_at,
  p.price_verified_at,
  p.price_freshness_threshold_days,
  p.updated_at
from public.products p
join public.suppliers s on s.id = p.supplier_id
left join public.product_variants v on v.product_id = p.id and v.is_active
where p.is_active
  and not coalesce(p.is_deleted, false)
  and s.active
  and s.is_product_supplier;

comment on view public.v_compras_catalogo is
  'Catalogo de produtos do PIM para o Promo Supply V2 (external-db-bridge). '
  'SECURITY DEFINER (security_invoker=false): NAO religar security_invoker=true ? medido que '
  'retorna 401 42501 sem grant na tabela-base (20261122180000). '
  'Campos mascarados (NULL) desde 20261123100000 (QA etapa 002): cost_price, suggested_price, '
  'supplier_reference, supplier_external_id. '
  'Consumidor: Promo Supply V2 / useCatalogoPim.ts via external-db-bridge.';
