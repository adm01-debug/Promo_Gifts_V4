-- ============================================================
-- Fix: produto P@13190L ficou sem imagem porque seu CF ID
-- (xbz-caneta-plastica-19160-1715860356) colidiu com produto f54ee094.
-- Solução: inserir com CF ID disambiguado usando sufixo do SKU.
-- ============================================================
SET LOCAL app.write_source = 'pipeline';

INSERT INTO product_images (
  product_id, cloudflare_image_id, url_cdn, url_original,
  image_type, is_primary, source_supplier, supplier_code, cf_sync_status, is_active
)
VALUES (
  '23dce40a-4665-4079-bab1-718270c02a51',
  'xbz-caneta-plastica-19160-1715860356-p13190l',
  'https://cdn.xbzbrindes.com.br/img/produtos/3/Caneta-Plastica-19160-1715860356.jpg',
  'https://cdn.xbzbrindes.com.br/img/produtos/3/Caneta-Plastica-19160-1715860356.jpg',
  'main', true, 'XBZ', 'XBZ', 'pending', true
)
ON CONFLICT (cloudflare_image_id) DO NOTHING;
;
