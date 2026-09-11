
-- FIX 12: Enforce at DB level that each product has at most one active primary image.
-- Currently this is maintained by application code and triggers, but has no DB guard.
-- A partial UNIQUE index is the cleanest approach — allows NULL/false without restriction.
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_images_one_primary_per_product
  ON public.product_images (product_id)
  WHERE is_primary = true AND is_active = true;

COMMENT ON INDEX uq_product_images_one_primary_per_product IS
  'Garante que cada produto tenha no máximo uma imagem primária ativa. Partial index: aplica-se apenas quando is_primary=true e is_active=true.';
;
