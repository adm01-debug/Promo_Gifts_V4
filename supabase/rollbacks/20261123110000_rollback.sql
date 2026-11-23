-- Rollback: 20261123110000_mask_cost_compras_precos_faixa.sql
-- Restaura unit_cost e handling_cost expostos.

create or replace view public.v_compras_precos_faixa
with (security_invoker = false) as
select
  pcp.product_id                          as pim_product_id,
  null::uuid                              as pim_variant_id,
  band.qty_min,
  lead(band.qty_min) over (
    partition by pcp.id
    order by band.ord
  ) - 1                                   as qty_max,
  band.unit_cost,
  null::numeric                           as unit_price,
  'spot_customization'::text              as source,
  pcp.service_code,
  pcp.table_code,
  pcp.component,
  pcp.location,
  pcp.handling_cost,
  pcp.table_max_area_cm2,
  pcp.max_stitches,
  pcp.hotspot,
  pcp.currency
from public.product_customization_prices pcp
cross join lateral (
  select
    t.qty_min_val  as qty_min,
    t.price_val    as unit_cost,
    t.ord
  from unnest(pcp.min_qty, pcp.price)
       with ordinality as t(qty_min_val, price_val, ord)
) band
where array_length(pcp.min_qty, 1) > 0;
