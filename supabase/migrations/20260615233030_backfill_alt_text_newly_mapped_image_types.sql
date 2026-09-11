
-- FIX 10: Backfill alt_text for image types now properly mapped in generate_image_alt_text
WITH candidates AS (
  SELECT
    pi.id,
    p.name          AS product_name,
    cv.name         AS color_name,
    pi.image_type,
    pi.display_order
  FROM public.product_images pi
  JOIN public.products p ON p.id = pi.product_id
  LEFT JOIN public.color_variations cv ON cv.id = pi.color_id
  WHERE pi.image_type IN ('product','location','set','component','area','ambient','detail','bag','mockup','thumbnail','vitrine_pessoa','vitrine_ambiente')
    AND (pi.alt_text ILIKE 'Imagem %' OR pi.alt_text ILIKE '%- Imagem %')
)
UPDATE public.product_images
SET
  alt_text   = generate_image_alt_text(
                  candidates.product_name,
                  candidates.image_type,
                  candidates.color_name,
                  COALESCE(candidates.display_order, 1)
               ),
  updated_at = NOW()
FROM candidates
WHERE product_images.id = candidates.id;
;
