-- ============================================================
-- Criar product_images (cf_sync_status=pending) para 17 produtos XBZ
-- ativos que têm ImageLink no Bronze mas nenhuma imagem no Gold.
-- A fn_get_image_upload_queue() repassará ao worker n8n noturno.
-- Os 13 restantes (dos 30) têm ImageLink vazio — sem URL disponível.
-- ============================================================
SET LOCAL app.write_source = 'pipeline';

WITH candidatos AS (
  SELECT DISTINCT ON (pp.product_id)
    pp.product_id,
    spr.raw_data->>'ImageLink' AS image_url,
    left('xbz-' || lower(
        regexp_replace(
          regexp_replace(spr.raw_data->>'ImageLink', '^.*/([^/?]+)(\?.*)?$', '\1'),
          '\.[^.]{2,5}$', ''
        )
    ), 100) AS cf_id
  FROM produtos_padronizacao pp
  JOIN supplier_products_raw spr ON spr.id = pp.raw_id
  WHERE pp.product_id IN (
    SELECT p.id FROM products p WHERE p.is_active
      AND NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id=p.id AND pi.is_active)
  )
  AND spr.raw_data->>'ImageLink' ILIKE 'http%'
  ORDER BY pp.product_id, spr.id
)
INSERT INTO product_images (
  product_id, cloudflare_image_id, url_cdn, url_original,
  image_type, is_primary, source_supplier, supplier_code, cf_sync_status, is_active
)
SELECT
  c.product_id,
  c.cf_id,
  c.image_url,
  c.image_url,
  'main',
  true,
  'XBZ', 'XBZ', 'pending', true
FROM candidatos c
ON CONFLICT (cloudflare_image_id) DO NOTHING;
;
