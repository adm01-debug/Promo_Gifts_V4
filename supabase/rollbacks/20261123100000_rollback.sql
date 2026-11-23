-- Rollback: 20261123100000_mask_cost_compras_catalogo.sql
-- Desfaz o mascaramento de cost_price, suggested_price, supplier_reference, supplier_external_id
-- Restaura a definicao anterior (versao 20261122100000 + security_invoker=false de 20261122180000).

create or replace view public.v_compras_catalogo
with (security_invoker = false) as
select
  p.id                        as pim_product_id,
  v.id                        as pim_variant_id,
  p.sku, p.sku_promo, p.name,
  p.supplier_id, s.code       as supplier_code, s.name as supplier_name,
  coalesce(v.supplier_sku, p.supplier_reference) as supplier_reference,
  p.supplier_external_id,
  p.cost_price, p.sale_price, p.suggested_price,
  p.ipi_rate, p.ncm_code,
  p.min_quantity, p.min_order_quantity, s.min_order_value,
  coalesce(v.stock_quantity, p.stock_quantity) as stock_quantity,
  p.is_stockout, p.last_stock_update_at,
  p.xbz_stock_reliability_text,
  v.color_id, v.color_name, v.color_code, v.color_hex, v.size_code,
  coalesce(p.primary_image_url, p.primary_image_fallback_url) as image_url,
  p.lead_time_days,
  p.price_updated_at, p.price_verified_at, p.price_freshness_threshold_days,
  p.updated_at
from public.products p
join public.suppliers s on s.id = p.supplier_id
left join public.product_variants v on v.product_id = p.id and v.is_active
where p.is_active and not coalesce(p.is_deleted, false) and s.active and s.is_product_supplier;
