
-- MELHORIA 4: Resincronizar products.primary_image_url com a imagem primária real
-- Corrige 1 produto onde primary_image_url diverge do product_images primary

UPDATE public.products p
SET primary_image_url = pi.url_cdn,
    updated_at = now()
FROM public.product_images pi
WHERE pi.product_id = p.id
  AND pi.is_primary = true
  AND pi.is_active = true
  AND pi.deleted_at IS NULL
  AND p.is_active = true
  AND (p.is_deleted IS NULL OR p.is_deleted = false)
  AND p.primary_image_url IS NOT NULL
  AND p.primary_image_url <> pi.url_cdn;
;
