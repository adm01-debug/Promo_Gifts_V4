-- ============================================================================
-- MELHORIA 6 — View de remediação: produtos ATIVOS com primária realmente quebrada
-- (não resolve p/ nenhuma imagem ativa verified/pending/uploaded). Worklist de re-upload.
-- Aditiva, sem mutação de dados. Revogada de anon/authenticated (padrão v_cf_recon_progress).
-- ============================================================================
CREATE OR REPLACE VIEW public.v_cf_image_remediation AS
SELECT
  p.id AS product_id,
  p.primary_image_url,
  (SELECT count(*) FROM public.product_images pi WHERE pi.product_id=p.id AND pi.is_active) AS active_imgs,
  (SELECT count(*) FROM public.product_images pi WHERE pi.product_id=p.id AND pi.is_active AND pi.cf_sync_status='verified') AS verified_active_imgs
FROM public.products p
WHERE p.is_active
  AND p.primary_image_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.product_images v
    WHERE v.url_cdn = p.primary_image_url AND v.is_active
      AND v.cf_sync_status IN ('verified','pending','uploaded')
  );

REVOKE ALL ON public.v_cf_image_remediation FROM anon, authenticated;
COMMENT ON VIEW public.v_cf_image_remediation IS
  'Produtos ATIVOS cuja primaria nao resolve p/ imagem ativa verified/pending/uploaded no Cloudflare. Worklist de re-upload (auditoria 2026-06-16); converge conforme a recon completa.';;
