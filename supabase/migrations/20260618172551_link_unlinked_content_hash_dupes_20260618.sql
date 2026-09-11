
-- MELHORIA 1: Vincular 1,621 grupos de content_hash duplicados sem canonical_image_id
WITH groups AS (
  SELECT content_hash,
    (array_agg(id ORDER BY created_at ASC, id ASC))[1] AS root_id
  FROM public.product_images
  WHERE deleted_at IS NULL
    AND content_hash IS NOT NULL
  GROUP BY content_hash
  HAVING COUNT(*) > 1
    AND COUNT(canonical_image_id) = 0
),
update_roots AS (
  UPDATE public.product_images
  SET is_shared = false,
      last_modified_source = 'migration'
  FROM groups
  WHERE id = groups.root_id
    AND canonical_image_id IS NULL
  RETURNING id
),
update_deps AS (
  UPDATE public.product_images pi
  SET canonical_image_id = g.root_id,
      is_shared = true,
      last_modified_source = 'migration'
  FROM groups g
  WHERE pi.content_hash = g.content_hash
    AND pi.id <> g.root_id
    AND pi.deleted_at IS NULL
    AND pi.canonical_image_id IS NULL
  RETURNING pi.id
)
SELECT 
  (SELECT COUNT(*) FROM update_roots) AS roots_marked,
  (SELECT COUNT(*) FROM update_deps) AS deps_linked;
;
