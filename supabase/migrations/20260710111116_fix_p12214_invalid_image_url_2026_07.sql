
-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION: fix_p12214_invalid_image_url_2026_07
--
-- BUG: P@12214 tem primary_image_url = 'https://cdn.xbzbrindes.com.br/12214'
-- Este URL retorna text/html (página web), NÃO uma imagem.
-- Quando o frontend tenta renderizar como <img>, resulta em broken image.
-- NULL é tratado com placeholder e é semanticamente correto.
-- ═══════════════════════════════════════════════════════════════════
UPDATE products
SET
  primary_image_url = NULL,
  og_image_url      = CASE WHEN og_image_url = 'https://cdn.xbzbrindes.com.br/12214' THEN NULL ELSE og_image_url END,
  updated_at        = NOW()
WHERE sku_promo = 'P@12214'
  AND primary_image_url = 'https://cdn.xbzbrindes.com.br/12214';
;
