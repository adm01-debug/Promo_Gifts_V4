-- migration: 20261121163000_v_compras_catalogo
-- PR 1.1 do plano Promo Supply V2 → só compras
--
-- Cria view pública de leitura no PIM (Promo Gifts V4) para ser consumida
-- pelo Promo Supply V2 via external-db-bridge (edge function).
-- security_invoker = on → permissões resolvidas com o papel do chamador.
-- Não expõe dados sensíveis do fornecedor (api_credentials, etc.).

create or replace view public.v_compras_catalogo
  with (security_invoker = on)
as
select
  p.id                                              as pim_product_id,
  v.id                                              as pim_variant_id,
  p.sku,
  p.sku_promo,
  p.name,
  p.supplier_id,
  s.code                                            as supplier_code,
  s.name                                            as supplier_name,
  coalesce(v.supplier_sku, p.supplier_reference)   as supplier_reference,
  p.cost_price,
  p.sale_price,
  p.suggested_price,
  p.ipi_rate,
  p.ncm_code,
  p.min_quantity,
  p.min_order_quantity,
  s.min_order_value,
  coalesce(v.stock_quantity, p.stock_quantity)      as stock_quantity,
  p.is_stockout,
  p.last_stock_update_at,
  v.color_id,
  v.color_name,
  v.color_code,
  v.color_hex,
  v.size_code,
  p.primary_image_url                               as image_url,
  p.lead_time_days,
  p.price_updated_at,
  p.updated_at
from public.products p
join public.suppliers s
  on s.id = p.supplier_id
left join public.product_variants v
  on v.product_id = p.id
 and v.is_active
where
  p.is_active
  and not coalesce(p.is_deleted, false)
  and s.active
  and s.is_product_supplier;

grant select on public.v_compras_catalogo to anon, authenticated;
