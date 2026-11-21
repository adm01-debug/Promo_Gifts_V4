-- PR 1.2 do plano PIM/Promo Supply V2: preco por faixa de quantidade
-- get_price_by_quantity NAO existe (verificado via pg_proc em 21/11/2026); a
-- fonte real e vw_variant_sale_prices, com ate 5 tiers fixos por variante
-- (cost_price_1..5 / sale_price_1..5 / min_qty_1..5). qty_max de cada tier e o
-- min_qty do proximo tier menos 1 (confirmado: min_qty_N e monotonico
-- crescente e os tiers nao sao esparsos no meio).

create or replace view public.v_compras_precos_faixa
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
from public.vw_variant_sale_prices where min_qty_5 is not null;

grant select on public.v_compras_precos_faixa to anon, authenticated;
