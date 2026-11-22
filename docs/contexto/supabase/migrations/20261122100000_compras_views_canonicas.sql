-- migration: 20261122100000_compras_views_canonicas
-- Rollback: supabase/rollbacks/20261122100000_rollback.sql
--
-- Consolida as views de compras do PIM (Promo Gifts V4) consumidas pelo
-- Promo Supply V2 via edge function external-db-bridge.
--
-- Por que esta migration existe:
--   1) 20261121163000_v_compras_catalogo.sql e 20261121183000_v_compras_precos_faixa.sql
--      foram mergeadas na main mas NUNCA aplicadas em producao (sem recibo E15 e sem
--      run de db-apply-migration.yml). O Promo Supply lia views inexistentes.
--   2) PR #3968 (view de catalogo) traz 5 colunas reais que a versao da main nao tem:
--      supplier_external_id, xbz_stock_reliability_text, price_verified_at,
--      price_freshness_threshold_days e o fallback de imagem. Aplicado aqui como
--      superconjunto aditivo, sem perder nada do que ja existia.
--   3) PR #3969 (faixas por variante) modela OUTRO conceito de negocio: preco de venda
--      por faixa de quantidade vindo de vw_variant_sale_prices, com 5 tiers fixos.
--      O contrato e incompativel com o que useCatalogoPim.ts espera em
--      v_compras_precos_faixa (service_code/table_code/component/location/
--      handling_cost/table_max_area_cm2/max_stitches/hotspot/currency). Sobrescrever
--      quebraria o Promo Supply, entao o trabalho foi preservado numa view separada
--      (v_compras_precos_variante) em vez de ser descartado.
--
-- Idempotente: create or replace view + grant.

-- ---------------------------------------------------------------------------
-- 1. Catalogo de produtos (superconjunto da PR #3968)
-- Requer products.supplier_external_id (20261121223000, ja aplicada).
-- ---------------------------------------------------------------------------
create or replace view public.v_compras_catalogo
with (security_invoker = on) as
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
where p.is_active and not coalesce(p.is_deleted, false) and s.active and s.is_product_supplier

comment on view public.v_compras_catalogo is
  'Catalogo de produtos do PIM para o Promo Supply V2 (external-db-bridge). '
  'Superconjunto da versao 20261121163000 com supplier_external_id, '
  'xbz_stock_reliability_text, price_verified_at, price_freshness_threshold_days '
  'e fallback de imagem (PR #3968).'

grant select on public.v_compras_catalogo to anon, authenticated

-- ---------------------------------------------------------------------------
-- 2. Faixas de preco de personalizacao (contrato que o Promo Supply consome)
-- Fonte: product_customization_prices (spot_customization).
-- ---------------------------------------------------------------------------
create or replace view public.v_compras_precos_faixa
with (security_invoker = on) as
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
where array_length(pcp.min_qty, 1) > 0

comment on view public.v_compras_precos_faixa is
  'Faixas de preco de personalizacao (product_customization_prices) desnormalizadas '
  'para consumo pelo Promo Supply V2 via external-db-bridge. '
  'Uma linha por faixa de quantidade. Fonte: spot_customization.'

grant select on public.v_compras_precos_faixa to anon, authenticated

-- ---------------------------------------------------------------------------
-- 3. Faixas de venda por variante (preserva o trabalho da PR #3969)
-- Fonte: vw_variant_sale_prices, ate 5 tiers fixos. Conceito distinto do item 2:
-- aqui e preco de VENDA por quantidade, nao preco de personalizacao.
-- View separada de proposito: nao substitui v_compras_precos_faixa.
-- ---------------------------------------------------------------------------
create or replace view public.v_compras_precos_variante
with (security_invoker = on) as
select product_id as pim_product_id, variant_id as pim_variant_id,
       1 as tier, min_qty_1 as qty_min, (min_qty_2 - 1) as qty_max,
       cost_price_1 as unit_cost, sale_price_1 as unit_price,
       'vw_variant_sale_prices' as source
from public.vw_variant_sale_prices where min_qty_1 is not null
union all
select product_id, variant_id, 2, min_qty_2, (min_qty_3 - 1),
       cost_price_2, sale_price_2, 'vw_variant_sale_prices'
from public.vw_variant_sale_prices where min_qty_2 is not null
union all
select product_id, variant_id, 3, min_qty_3, (min_qty_4 - 1),
       cost_price_3, sale_price_3, 'vw_variant_sale_prices'
from public.vw_variant_sale_prices where min_qty_3 is not null
union all
select product_id, variant_id, 4, min_qty_4, (min_qty_5 - 1),
       cost_price_4, sale_price_4, 'vw_variant_sale_prices'
from public.vw_variant_sale_prices where min_qty_4 is not null
union all
select product_id, variant_id, 5, min_qty_5, null::integer,
       cost_price_5, sale_price_5, 'vw_variant_sale_prices'
from public.vw_variant_sale_prices where min_qty_5 is not null

comment on view public.v_compras_precos_variante is
  'Preco de VENDA por faixa de quantidade e por variante (vw_variant_sale_prices), '
  'ate 5 tiers. Trabalho preservado da PR #3969. Conceito distinto de '
  'v_compras_precos_faixa (preco de personalizacao); as duas coexistem.'

grant select on public.v_compras_precos_variante to anon, authenticated
