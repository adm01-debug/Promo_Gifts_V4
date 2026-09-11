
-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION: fix_is_primary_flag_xbz_gallery_to_primary_2026_07
-- 
-- BUG: 31 produtos têm primary_image_url=CF mas product_images.is_primary=FALSE
-- 
-- CAUSA: imagens foram inseridas como 'gallery' (is_primary=false) em sessão
-- anterior, mas foram as ÚNICAS imagens do produto e a primary_image_url
-- do produto foi atualizada para apontar ao url_cdn delas.
-- 
-- FIX: para produtos onde TODOS os registros têm is_primary=false e
-- url_cdn = products.primary_image_url, promover a record correspondente
-- a is_primary=TRUE.
-- ═══════════════════════════════════════════════════════════════════

UPDATE product_images pi
SET is_primary  = true,
    updated_at  = NOW()
FROM products p
WHERE pi.product_id = p.id
  AND p.is_active   = true
  AND pi.is_active  = true
  AND pi.cf_sync_status = 'verified'
  AND pi.url_cdn    = p.primary_image_url     -- url bate com primary do produto
  AND pi.is_primary = false                   -- ainda não marcada como primária
  AND NOT EXISTS (                            -- produto não tem outra imagem primária
    SELECT 1 FROM product_images pi2
    WHERE pi2.product_id = p.id
      AND pi2.is_primary = true
      AND pi2.is_active  = true
  );
;
