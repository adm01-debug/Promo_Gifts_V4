-- =============================================================================
-- PR 1.2 — v_compras_precos_faixa
-- View read-only para o Promo Supply V2 consumir faixas de preço de
-- personalização do PIM (product_customization_prices).
--
-- Regras:
--   • security_invoker = on  → herda permissões do chamador
--   • GRANT SELECT TO anon, authenticated  → acessível via service_role da
--     edge function external-db-bridge do Promo Supply
--   • Uma linha por faixa (UNNEST dos arrays min_qty / price)
--   • qty_max = min_qty do próximo índice − 1; NULL na última faixa
--   • unit_price = NULL (Promo Supply aplica markup próprio)
--   • source = 'spot_customization' para rastreabilidade
-- =============================================================================

CREATE OR REPLACE VIEW public.v_compras_precos_faixa
WITH (security_invoker = on)
AS
SELECT
  pcp.product_id                          AS pim_product_id,
  NULL::uuid                              AS pim_variant_id,
  band.qty_min,
  -- qty_max = próxima faixa − 1; NULL quando for a última
  LEAD(band.qty_min) OVER (
    PARTITION BY pcp.id
    ORDER BY band.ord
  ) - 1                                   AS qty_max,
  band.unit_cost,
  NULL::numeric                           AS unit_price,
  'spot_customization'::text              AS source,
  pcp.service_code,
  pcp.table_code,
  pcp.component,
  pcp.location,
  pcp.handling_cost,
  pcp.table_max_area_cm2,
  pcp.max_stitches,
  pcp.hotspot,
  pcp.currency
FROM public.product_customization_prices pcp
CROSS JOIN LATERAL (
  SELECT
    t.qty_min_val  AS qty_min,
    t.price_val    AS unit_cost,
    t.ord
  FROM unnest(pcp.min_qty, pcp.price)
       WITH ORDINALITY AS t(qty_min_val, price_val, ord)
) band
WHERE array_length(pcp.min_qty, 1) > 0;

COMMENT ON VIEW public.v_compras_precos_faixa IS
  'Faixas de preço de personalização (product_customization_prices) desnormalizadas '
  'para consumo pelo Promo Supply V2 via external-db-bridge. '
  'Uma linha por faixa de quantidade. Fonte: spot_customization.';

GRANT SELECT ON public.v_compras_precos_faixa TO anon, authenticated;
