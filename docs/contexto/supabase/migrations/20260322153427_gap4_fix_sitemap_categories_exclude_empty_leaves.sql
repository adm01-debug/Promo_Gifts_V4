-- =================================================================
-- GAP 4 FIX: Sitemap exclui folhas vazias (0 produtos + 0 filhos)
-- Mantém categorias-pai de navegação (children_count > 0)
-- ANTES: 433 URLs | DEPOIS: ~207 URLs
-- Criado em: 2026-03-22
-- =================================================================

CREATE OR REPLACE VIEW vw_sitemap_categories AS
SELECT 'category'::text AS url_type,
    ('/categoria/'::text || slug) AS url_path,
    slug AS identifier,
    name AS title,
    updated_at AS lastmod,
    COALESCE(seo_priority,
        CASE
            WHEN (level = 1) THEN 0.9
            WHEN (level = 2) THEN 0.8
            ELSE 0.7
        END) AS priority,
    'weekly'::text AS changefreq,
    image_url,
    COALESCE(meta_title, name) AS title_seo,
    products_count
FROM categories
WHERE is_active = true 
  AND is_visible = true 
  AND slug IS NOT NULL
  AND (products_count > 0 OR children_count > 0)
ORDER BY level, COALESCE(seo_priority,
    CASE
        WHEN (level = 1) THEN 0.9
        WHEN (level = 2) THEN 0.8
        ELSE 0.7
    END) DESC, name;

COMMENT ON VIEW vw_sitemap_categories IS 
'Sitemap de categorias para SEO. FIX 2026-03-22: Exclui folhas vazias (products_count=0 AND children_count=0) para não indexar páginas sem conteúdo.';
