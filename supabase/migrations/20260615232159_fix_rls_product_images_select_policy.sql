
-- ============================================================
-- FIX 3: RLS SELECT — qualquer user logado via auth.uid() IS NOT NULL
-- podia ver TODAS as imagens (inclusive inativas e de outras orgs futuras).
-- Fix: imagens inativas agora só aparecem para owner/admin da org.
-- ============================================================

-- Dropar política permissiva atual
DROP POLICY IF EXISTS product_images_select ON public.product_images;

-- Nova política: ativas → todos; inativas → só admins da org
CREATE POLICY product_images_select ON public.product_images
  FOR SELECT
  USING (
    is_active = true
    OR is_org_owner_or_admin(organization_id)
  );

COMMENT ON POLICY product_images_select ON public.product_images IS
  'FIXED 2026-06-15: era (is_active OR auth.uid() IS NOT NULL) → qualquer logado via ALL images.
   Agora: is_active=true visível a todos; inativas só para owner/admin da org.';
;
