-- ═══════════════════════════════════════════════════════════════════════
-- SEO M4: Índice documentado para listagem por score SEO
-- fix_version: seo_idx_listing_v1_20260627
-- Suporta vw_products_seo_status (ORDER BY seo_score ASC, name ASC)
-- e filtros por faixas de score (/admin/seo?filter=poor)
-- ═══════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_products_seo_listing
ON public.products (seo_score ASC, name ASC)
WHERE (is_active = true AND is_deleted = false);

COMMENT ON INDEX idx_products_seo_listing IS
'SEO M4 (2026-06-27): índice documentado em db-product-architecture-v2.md.
Suporta vw_products_seo_status ORDER BY seo_score + filtros de faixa.
fix_version: seo_idx_listing_v1_20260627';;
