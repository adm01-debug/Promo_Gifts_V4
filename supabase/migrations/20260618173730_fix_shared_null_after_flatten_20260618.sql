
-- CORREÇÃO: 65 registros is_shared=true mas canonical_image_id=NULL (artefato da CTE de flatten)
-- Para cada um, encontrar o root do seu grupo (content_hash group) e religar

-- Passo 1: Religar ao root via content_hash (onde há root is_shared=false, canonical=NULL)
WITH roots_by_hash AS (
  SELECT content_hash,
    (array_agg(id ORDER BY created_at ASC, id ASC))[1] AS root_id
  FROM public.product_images
  WHERE deleted_at IS NULL
    AND canonical_image_id IS NULL
    AND is_shared = false
    AND content_hash IN (
      SELECT content_hash FROM public.product_images
      WHERE deleted_at IS NULL AND is_shared = true AND canonical_image_id IS NULL
    )
  GROUP BY content_hash
)
UPDATE public.product_images pi
SET canonical_image_id = r.root_id,
    is_shared = true,
    last_modified_source = 'migration'
FROM roots_by_hash r
WHERE pi.content_hash = r.content_hash
  AND pi.is_shared = true
  AND pi.canonical_image_id IS NULL
  AND pi.deleted_at IS NULL
  AND pi.id <> r.root_id;

-- Passo 2: Para qualquer restante que não tinha root no grupo → tornar root
-- (edge case: todos no grupo tiveram canonical=NULL zerado)
WITH groups_all_null AS (
  SELECT content_hash,
    (array_agg(id ORDER BY created_at ASC, id ASC))[1] AS root_id
  FROM public.product_images
  WHERE deleted_at IS NULL
    AND is_shared = true
    AND canonical_image_id IS NULL
    AND content_hash IS NOT NULL
  GROUP BY content_hash
)
UPDATE public.product_images pi
SET is_shared = false,
    canonical_image_id = NULL,
    last_modified_source = 'migration'
FROM groups_all_null g
WHERE pi.id = g.root_id
  AND pi.is_shared = true;

-- Passo 3: Religar restantes ao novo root (caso passo 2 elegeu alguém como root)
UPDATE public.product_images pi
SET canonical_image_id = (
  SELECT r.id FROM public.product_images r
  WHERE r.content_hash = pi.content_hash
    AND r.deleted_at IS NULL
    AND r.canonical_image_id IS NULL
    AND r.is_shared = false
    AND r.id <> pi.id
  ORDER BY r.created_at ASC, r.id ASC
  LIMIT 1
),
is_shared = true,
last_modified_source = 'migration'
WHERE deleted_at IS NULL
  AND is_shared = true
  AND canonical_image_id IS NULL;
;
