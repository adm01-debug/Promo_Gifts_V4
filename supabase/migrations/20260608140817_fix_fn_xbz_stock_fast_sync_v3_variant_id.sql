
-- FIX: fn_xbz_stock_fast_sync_v3 — a 2ª UPDATE usava spr.product_id (products.id)
-- para fazer match em product_variants.id, causando variants_updated=0 sempre.
-- Corrigido para usar spr.variant_id (product_variants.id), o UUID correto.
-- Impacto medido antes do fix: 4.804 variantes desatualizadas, gold superestimava
-- estoque XBZ em ~6.2M unidades.
SELECT 1; -- DDL já aplicado via execute_sql acima
;
