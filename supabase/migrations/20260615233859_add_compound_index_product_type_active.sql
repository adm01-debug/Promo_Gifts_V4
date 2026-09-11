
-- FIX 17: Add compound index for the most common query pattern in fn_sync_product_images_to_products:
-- WHERE product_id = X AND is_active = true AND image_type NOT IN (...)
-- Also used by application queries: "all gallery images for product X"
-- The existing product_images_display_idx (product_id, display_order WHERE is_active=true)
-- does not help filter by image_type.

CREATE INDEX IF NOT EXISTS idx_product_images_product_type_active
  ON public.product_images (product_id, image_type, display_order)
  WHERE is_active = true;

COMMENT ON INDEX idx_product_images_product_type_active IS
  'Compound index para queries por produto + tipo de imagem com filtro is_active=true. '
  'Usado por fn_sync_product_images_to_products e pelos hooks de galeria do frontend.';
;
