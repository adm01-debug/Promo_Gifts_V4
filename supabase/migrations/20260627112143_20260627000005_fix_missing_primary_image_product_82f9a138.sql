-- ============================================================
-- Produto 82f9a138: 1 imagem ativa (asia-bac005p-03) sem is_primary=true.
-- Produto is_active=false (inativo); correção garante integridade
-- para eventual reativação. image_type promovido de gallery→main.
-- ============================================================
SET LOCAL app.write_source = 'pipeline';

UPDATE product_images
SET
  is_primary    = true,
  image_type    = 'main',
  image_type_id = (SELECT id FROM image_types WHERE code = 'main' LIMIT 1)
WHERE id          = '815d9211-209b-44f4-9d64-10d791b90b6a'
  AND product_id  = '82f9a138-7f14-4190-bdee-f960317b2fc5'
  AND is_primary  = false;
;
