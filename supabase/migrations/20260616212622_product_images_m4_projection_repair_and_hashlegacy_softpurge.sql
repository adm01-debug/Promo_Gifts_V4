-- ============================================================================
-- MELHORIA 4 — Reparo de projeções obsoletas (UX) + expurgo SOFT hash_legacy
-- Repoint cirúrgico em products (replica mode = 0 efeitos colaterais dos 33 triggers).
-- Reversível: snapshot em backup.products_imageproj_20260616.
-- Os 16 produtos SEM imagem ativa NÃO são tocados (serão sinalizados p/ re-importação).
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS backup;
CREATE TABLE IF NOT EXISTS backup.products_imageproj_20260616 AS
  SELECT id, primary_image_url, og_image_url, primary_image_fallback_url, now() AS snapshot_at
  FROM public.products
  WHERE primary_image_url IN (SELECT url_cdn FROM public.product_images WHERE is_active IS NOT TRUE)
     OR og_image_url      IN (SELECT url_cdn FROM public.product_images WHERE is_active IS NOT TRUE);

SET LOCAL session_replication_role = replica;

-- M4a: primary_image_url obsoleto (-> inativa) repointado p/ a primária ATIVA
WITH ap AS (
  SELECT DISTINCT ON (product_id) product_id, url_cdn
  FROM public.product_images WHERE is_active AND is_primary
  ORDER BY product_id, display_order
)
UPDATE public.products p
   SET primary_image_url = ap.url_cdn, updated_at = now()
  FROM ap
 WHERE p.id = ap.product_id
   AND p.primary_image_url IS DISTINCT FROM ap.url_cdn
   AND p.primary_image_url IN (SELECT url_cdn FROM public.product_images WHERE is_active IS NOT TRUE);

-- M4a': og_image_url obsoleto repointado p/ a primária ATIVA (OG = primária após M1)
WITH ap AS (
  SELECT DISTINCT ON (product_id) product_id, url_cdn
  FROM public.product_images WHERE is_active AND is_primary
  ORDER BY product_id, display_order
)
UPDATE public.products p
   SET og_image_url = ap.url_cdn, updated_at = now()
  FROM ap
 WHERE p.id = ap.product_id
   AND p.og_image_url IS DISTINCT FROM ap.url_cdn
   AND p.og_image_url IN (SELECT url_cdn FROM public.product_images WHERE is_active IS NOT TRUE);

-- M4b: expurgo SOFT das hash_legacy (inativas, 100% ausentes no CF) — reversível
UPDATE public.product_images
   SET deleted_at = now(),
       deleted_reason = 'hash_legacy xbz_site_* 100% ausente no Cloudflare (auditoria 2026-06-16); inativa, sem impacto UX',
       last_modified_source = 'claude'
 WHERE cf_id_scheme = 'hash_legacy'
   AND deleted_at IS NULL;

SET LOCAL session_replication_role = origin;;
