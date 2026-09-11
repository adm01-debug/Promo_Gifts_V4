-- Monitor durável: produtos ATIVOS sem imagem no Gold, com diagnóstico do backlog no Bronze.
-- Auto-limpa: conforme o pipeline promove as imagens (images_status pending->done), o produto sai da view.
CREATE OR REPLACE VIEW public.vw_active_products_missing_gold_images AS
SELECT
  p.id                                                          AS product_id,
  p.name,
  p.supplier_id,
  p.sku,
  p.supplier_reference,
  p.primary_image_url,
  count(r.id)                                                   AS bronze_rows,
  count(*) FILTER (WHERE r.images_status::text = 'pending')     AS bronze_imgs_pending,
  count(*) FILTER (WHERE r.images_processed = true)             AS bronze_imgs_processadas,
  max(r.updated_at)                                             AS bronze_ultima_atualizacao
FROM public.products p
JOIN public.supplier_products_raw r ON r.product_id = p.id
WHERE p.is_active
  AND p.primary_image_url IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.product_images pi WHERE pi.product_id = p.id)
GROUP BY p.id, p.name, p.supplier_id, p.sku, p.supplier_reference, p.primary_image_url;

COMMENT ON VIEW public.vw_active_products_missing_gold_images IS
  'Backlog de imagens: produtos ativos sem registro em product_images (Gold), com imagens presas em images_status=pending no Bronze. '
  'Remediação = pipeline de imagens drenar o pending (NÃO inserir em Gold manualmente). Auto-limpa quando o pipeline promove.';;
