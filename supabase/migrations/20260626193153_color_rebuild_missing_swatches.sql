-- 22 produtos ativos com cores (color_name nas variantes) porém color_swatches vazio/nulo (cache stale).
-- Regenera via builder oficial fn_rebuild_color_swatches (dedupe por color_id, hex/nome/stock corretos, image_url com fallback).
-- Idempotente: só atinge os de swatch vazio. Não dispara cascata (triggers de rebuild são em product_images/product_variants).
UPDATE products SET color_swatches = public.fn_rebuild_color_swatches(id)
WHERE is_active
  AND EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id=products.id AND v.is_active AND NULLIF(TRIM(v.color_name),'') IS NOT NULL)
  AND (color_swatches IS NULL OR jsonb_array_length(COALESCE(color_swatches,'[]'::jsonb))=0);;
