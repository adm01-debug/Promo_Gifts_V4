
-- Identificar canonical (mais primary > mais antigo) por content_hash e linkar os demais
WITH ranked AS (
  SELECT 
    id,
    content_hash,
    ROW_NUMBER() OVER (
      PARTITION BY content_hash 
      ORDER BY is_primary DESC NULLS LAST, created_at ASC, id ASC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY content_hash 
      ORDER BY is_primary DESC NULLS LAST, created_at ASC, id ASC
    ) AS canonical_id
  FROM public.product_images
  WHERE content_hash IS NOT NULL AND deleted_at IS NULL
    AND content_hash IN (
      SELECT content_hash FROM public.product_images
      WHERE content_hash IS NOT NULL AND deleted_at IS NULL
      GROUP BY content_hash HAVING COUNT(*) > 1
    )
)
UPDATE public.product_images pi
SET 
  canonical_image_id = r.canonical_id,
  is_shared = true,
  last_modified_source = 'claude',
  updated_at = now()
FROM ranked r
WHERE pi.id = r.id 
  AND r.rn > 1                          -- só os não-canonical
  AND r.canonical_id <> pi.id           -- defesa contra chk_pi_canonical_not_self
  AND (pi.canonical_image_id IS DISTINCT FROM r.canonical_id OR pi.is_shared = false);

-- Marcar canonicals como is_shared=true também (sinal de que pertencem a um grupo)
WITH ranked AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY content_hash 
      ORDER BY is_primary DESC NULLS LAST, created_at ASC, id ASC
    ) AS rn
  FROM public.product_images
  WHERE content_hash IS NOT NULL AND deleted_at IS NULL
    AND content_hash IN (
      SELECT content_hash FROM public.product_images
      WHERE content_hash IS NOT NULL AND deleted_at IS NULL
      GROUP BY content_hash HAVING COUNT(*) > 1
    )
)
UPDATE public.product_images pi
SET 
  is_shared = true,
  last_modified_source = 'claude',
  updated_at = now()
FROM ranked r
WHERE pi.id = r.id AND r.rn = 1 AND pi.is_shared = false;
;
