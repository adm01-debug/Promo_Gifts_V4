
-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION: fix_cpnp_asia_image_upload_2026_07
--
-- Produto CPNP (Caderno para anotações com estojo e caneta cad300)
-- identificado como CAD300P na ASIA Import.
-- Imagem carregada para CF via ASIA CDN.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Criar registro em product_images
INSERT INTO product_images (
  product_id,
  cloudflare_image_id,
  url_original,
  url_cdn,
  is_primary,
  is_active,
  cf_sync_status,
  cf_uploaded_at,
  cf_verified_at,
  cf_check_attempts,
  display_order,
  source_supplier,
  organization_id,
  image_type_id
)
SELECT
  p.id,
  'asia-cpnp-cad300p-perfil-2024',
  'https://media.asiaimport.com.br/2024/05/Perfil_novo-15.jpg',
  'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/asia-cpnp-cad300p-perfil-2024/public',
  true,
  true,
  'verified',
  NOW(),
  NOW(),
  1,
  1,
  'ASIA',
  '5db5aee1-064b-4ef4-9193-345dcd8274ea',
  '1590e144-e3f8-41e6-98f9-f4a25bae496d'
FROM products p
WHERE p.sku_promo = 'CPNP'
ON CONFLICT (cloudflare_image_id) DO NOTHING;

-- 2. Atualizar primary_image_url no produto
UPDATE products
SET
  primary_image_url = 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/asia-cpnp-cad300p-perfil-2024/public',
  og_image_url      = 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/asia-cpnp-cad300p-perfil-2024/public',
  updated_at        = NOW()
WHERE sku_promo = 'CPNP';
;
