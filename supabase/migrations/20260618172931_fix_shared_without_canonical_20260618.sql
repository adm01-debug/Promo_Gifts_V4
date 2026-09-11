
-- MELHORIA 3a: Vincular os 60 que têm root identificável
WITH roots AS (
  SELECT pi_root.content_hash, pi_root.id AS root_id
  FROM public.product_images pi_root
  WHERE pi_root.deleted_at IS NULL
    AND pi_root.canonical_image_id IS NULL
    AND pi_root.is_shared = false
)
UPDATE public.product_images pi_orphan
SET canonical_image_id = r.root_id,
    last_modified_source = 'migration'
FROM roots r
WHERE pi_orphan.content_hash = r.content_hash
  AND pi_orphan.is_shared = true
  AND pi_orphan.canonical_image_id IS NULL
  AND pi_orphan.deleted_at IS NULL;

-- MELHORIA 3b: Para os restantes (sem root localizável) → limpar is_shared inconsistente
UPDATE public.product_images
SET is_shared = false,
    last_modified_source = 'migration'
WHERE deleted_at IS NULL
  AND is_shared = true
  AND canonical_image_id IS NULL;
;
