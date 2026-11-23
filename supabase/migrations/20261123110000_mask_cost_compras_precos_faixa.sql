-- Migration: 20261123110000_mask_cost_compras_precos_faixa.sql
-- Rollback: supabase/rollbacks/20261123110000_rollback.sql
--
-- QA Plano Etapa 003 (ACH-002) ? Mascarar unit_cost e handling_cost em v_compras_precos_faixa
--
-- PROBLEMA HOJE (medido em 2026-11-22, auditoria QA commit ded84e9):
--   GET /rest/v1/v_compras_precos_faixa com anon key retorna HTTP 200 com
--   unit_cost: 150.15, handling_cost: valor real. Expoem custo de personalizacao por faixa.
--
-- DECISAO: mesmo padrao da Etapa 002 (v_compras_catalogo):
--   unit_cost    -> NULL::numeric  (custo unitario de personalizacao ? nunca exposto ao publico)
--   handling_cost -> NULL::numeric (custo de manuseio ? derivado operacional)
--   unit_price   permanece exposto (preco de venda, nao custo)
--
-- SEGURANCA: security_invoker permanece FALSE (ver justificativa em 20261122180000).

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
  NULL::numeric                           as unit_cost,
  null::numeric                           as unit_price,
  'spot_customization'::text              as source,
  pcp.service_code,
  pcp.table_code,
  pcp.component,
  pcp.location,
  NULL::numeric                           as handling_cost,
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

comment on view public.v_compras_precos_faixa is
  'Faixas de preco de personalizacao (product_customization_prices) desnormalizadas '
  'para consumo pelo Promo Supply V2 via external-db-bridge. '
  'SECURITY DEFINER (security_invoker=false): NAO religar security_invoker=true. '
  'Campos mascarados (NULL) desde 20261123110000 (QA etapa 003): unit_cost, handling_cost. '
  'unit_price continua exposto (preco de venda).';
