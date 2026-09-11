
-- ============================================================
-- FIX 7: Índice para OG image lookup + documentação da tabela
-- NOTA: CREATE INDEX sem CONCURRENTLY (dentro de migration/transaction)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_product_images_og
  ON public.product_images (product_id, display_order)
  WHERE is_og_image = true AND is_active = true;

COMMENT ON INDEX idx_product_images_og IS
  'Acelera lookup de OG image por produto (is_og_image=true AND is_active=true).
   Usado pelo trigger fn_sync_product_images_to_products ao calcular og_image_url.
   Adicionado 2026-06-15.';

COMMENT ON TABLE public.product_images IS
  'Registro canônico de toda mídia fotográfica do catálogo B2B Promo Brindes.
   73k+ imagens de 4 fornecedores (XBZ 57%, SPOT 29%, ASIA 8%, SOMARCAS 6%).
   Todas hospedadas no Cloudflare Images (imagedelivery.net).
   
   PIPELINE: ingestão via pg_cron (jobs 76/77/78/89/91) → triggers BEFORE→AFTER
   → sincronização automática em products (primary_image_url, og_image_url, images[]).
   
   DEPRECAÇÃO ATIVA: coluna image_type (varchar) em substituição por image_type_id
   (FK→image_types). Monitorar via vw_image_type_dropblockers antes de dropar.';
;
