
-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION: fix_pending_gaps_image_pipeline_testep_2026_07
-- Melhorias identificadas nas auditorias das PRs #1642–#1649
--
-- OP 1: Desativar TESTEP (produto de teste → eliminava warn variant_sem_nome_de_cor)
-- OP 2: Criar product_images para XBZ produtos com 0 registros + URL válida
-- OP 3: Corrigir URL de P@11933 (www → cdn.xbzbrindes.com.br)
--
-- Notas:
-- • cf_id_scheme é GENERATED ALWAYS (omitido do INSERT, computado automaticamente)
-- • Trigger trg_aa_block_product_deactivation requer GUC app.deactivation_approved='true'
-- ═══════════════════════════════════════════════════════════════════════

-- OP 1 ─── Autorizar desativação via GUC ──────────────────────────────
SELECT set_config('app.deactivation_approved', 'true', true);

UPDATE products
SET    is_active  = false,
       updated_at = NOW()
WHERE  sku_promo   = 'TESTEP'
  AND  supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'
  AND  is_active   = true;

-- OP 2 ─── Criar product_images para XBZ com total_imgs=0 ─────────────
INSERT INTO product_images (
  product_id,
  cloudflare_image_id,       -- GENERATED cf_id_scheme depende deste campo
  url_cdn,                   -- URL XBZ; pipeline CF atualizará para imagedelivery.net
  url_original,              -- fonte original para o pipeline usar
  is_primary,
  display_order,
  cf_sync_status,
  cf_check_attempts,
  source_supplier,
  image_type,
  image_type_id,
  organization_id,
  is_active,
  applies_to_color
)
SELECT
  p.id,
  -- Deriva CF ID: xbz-{lowercase filename sem extensão e query string}
  lower('xbz-' || regexp_replace(
    substring(p.primary_image_url FROM '[^/]+$'),
    '\.[a-zA-Z]{2,4}(\?.*)?$',
    ''
  ))                         AS cloudflare_image_id,
  p.primary_image_url        AS url_cdn,
  p.primary_image_url        AS url_original,
  true                       AS is_primary,
  0                          AS display_order,
  'pending'                  AS cf_sync_status,
  0                          AS cf_check_attempts,
  'XBZ'                      AS source_supplier,
  'gallery'                  AS image_type,
  '1590e144-e3f8-41e6-98f9-f4a25bae496d'::uuid AS image_type_id,
  '5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid AS organization_id,
  true                       AS is_active,
  false                      AS applies_to_color
FROM products p
WHERE p.is_active   = true
  AND p.supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900'  -- XBZ Brindes
  AND p.primary_image_url IS NOT NULL
  AND p.primary_image_url ~ '\.(jpg|jpeg|png|gif|webp)(\?|$)'  -- URL de imagem válida
  AND NOT EXISTS (
    SELECT 1 FROM product_images pi
    WHERE pi.product_id = p.id
      AND pi.is_active  = true
  )
ON CONFLICT DO NOTHING;

-- OP 3 ─── Corrigir domínio de P@11933 ───────────────────────────────
UPDATE products
SET  primary_image_url = replace(primary_image_url,
                           'www.xbzbrindes.com.br',
                           'cdn.xbzbrindes.com.br'),
     og_image_url      = replace(og_image_url,
                           'www.xbzbrindes.com.br',
                           'cdn.xbzbrindes.com.br'),
     updated_at        = NOW()
WHERE sku_promo        = 'P@11933'
  AND primary_image_url LIKE '%www.xbzbrindes.com.br%';
;
