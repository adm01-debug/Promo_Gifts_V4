
-- ============================================================
-- ETAPA 5: Recriar views SEO (v3 — correções + melhorias)
-- Fix B4: adicionar is_deleted = false em vw_sitemap_products
-- Melhoria: supplier_reference, ai_title, schema_json coverage
-- ============================================================

-- Drop em ordem de dependência
DROP VIEW IF EXISTS public.vw_seo_dashboard          CASCADE;
DROP VIEW IF EXISTS public.vw_products_seo_status    CASCADE;
DROP VIEW IF EXISTS public.vw_sitemap_all            CASCADE;
DROP VIEW IF EXISTS public.vw_sitemap_categories     CASCADE;
DROP VIEW IF EXISTS public.vw_sitemap_products       CASCADE;

-- ============================================================
-- VIEW 1: vw_sitemap_products  (FIX: + is_deleted = false)
-- ============================================================
CREATE VIEW public.vw_sitemap_products AS
SELECT
    'product'::text AS url_type,
    '/produto/' || COALESCE(slug, id::text) AS url_path,
    COALESCE(slug, id::text)               AS identifier,
    name                                   AS title,
    supplier_reference,
    updated_at                             AS lastmod,
    CASE
        WHEN is_featured     = true THEN 1.0
        WHEN is_bestseller   = true THEN 0.9
        WHEN is_new          = true THEN 0.8
        ELSE 0.7
    END AS priority,
    CASE
        WHEN is_featured = true OR is_bestseller = true THEN 'daily'
        ELSE 'weekly'
    END AS changefreq,
    COALESCE(primary_image_url, og_image_url) AS image_url,
    COALESCE(meta_title, name)             AS image_title,
    COALESCE(seo_score, 0)                 AS seo_score
FROM products
WHERE is_active  = true
  AND is_deleted = false
  AND (robots_meta IS NULL OR robots_meta NOT LIKE '%noindex%')
ORDER BY priority DESC, updated_at DESC;

COMMENT ON VIEW public.vw_sitemap_products IS
    'v3 — Dados para sitemap XML de produtos. Corrigido: is_deleted=false';

-- ============================================================
-- VIEW 2: vw_sitemap_categories
-- ============================================================
CREATE VIEW public.vw_sitemap_categories AS
SELECT
    'category'::text AS url_type,
    '/categoria/' || slug AS url_path,
    slug               AS identifier,
    name               AS title,
    updated_at         AS lastmod,
    COALESCE(seo_priority,
        CASE
            WHEN level = 1 THEN 0.9
            WHEN level = 2 THEN 0.8
            ELSE 0.7
        END
    ) AS priority,
    'weekly'::text AS changefreq,
    image_url,
    COALESCE(meta_title, name) AS title_seo,
    products_count
FROM categories
WHERE is_active  = true
  AND is_visible = true
  AND slug IS NOT NULL
ORDER BY level ASC, priority DESC, name ASC;

COMMENT ON VIEW public.vw_sitemap_categories IS
    'v3 — Dados para sitemap XML de categorias';

-- ============================================================
-- VIEW 3: vw_sitemap_all
-- ============================================================
CREATE VIEW public.vw_sitemap_all AS
SELECT url_type, url_path, identifier, title, lastmod, priority, changefreq, image_url
FROM public.vw_sitemap_products
UNION ALL
SELECT url_type, url_path, identifier, title, lastmod, priority, changefreq, image_url
FROM public.vw_sitemap_categories
ORDER BY priority DESC, lastmod DESC;

COMMENT ON VIEW public.vw_sitemap_all IS
    'v3 — União produtos + categorias para sitemap XML completo';

-- ============================================================
-- VIEW 4: vw_products_seo_status  (melhorada: ai_title, schema_json)
-- ============================================================
CREATE VIEW public.vw_products_seo_status AS
SELECT
    p.id,
    p.name,
    p.sku,
    p.supplier_reference,
    p.slug,
    s.name AS supplier_name,

    -- Indicadores binários
    CASE WHEN p.slug IS NOT NULL AND LENGTH(TRIM(p.slug)) > 0       THEN '✅' ELSE '❌' END AS has_slug,
    CASE WHEN p.meta_title IS NOT NULL AND LENGTH(TRIM(p.meta_title)) > 0 THEN '✅' ELSE '❌' END AS has_meta_title,
    CASE WHEN p.meta_description IS NOT NULL AND LENGTH(TRIM(p.meta_description)) > 0 THEN '✅' ELSE '❌' END AS has_meta_description,
    CASE
        WHEN LENGTH(COALESCE(p.description, '')) >= 300 THEN '✅'
        WHEN LENGTH(COALESCE(p.description, '')) >= 100 THEN '🟡'
        ELSE '❌'
    END AS has_good_description,
    CASE WHEN p.ai_title IS NOT NULL AND LENGTH(TRIM(p.ai_title)) > 0 THEN '✅' ELSE '❌' END AS has_ai_title,
    CASE WHEN p.ai_summary IS NOT NULL AND LENGTH(TRIM(p.ai_summary)) > 0 THEN '✅' ELSE '❌' END AS has_ai_summary,
    CASE WHEN p.schema_json IS NOT NULL THEN '✅' ELSE '❌' END AS has_schema_json,

    -- Tamanhos
    LENGTH(COALESCE(p.meta_title, ''))       AS meta_title_length,
    LENGTH(COALESCE(p.meta_description, '')) AS meta_description_length,
    LENGTH(COALESCE(p.description, ''))      AS description_length,

    -- Imagens
    (SELECT COUNT(*)
     FROM product_images
     WHERE product_id = p.id AND is_active = true)              AS image_count,
    (SELECT COUNT(*)
     FROM product_images
     WHERE product_id = p.id AND is_active = true AND alt_text IS NOT NULL) AS images_with_alt,

    -- Score
    COALESCE(p.seo_score, 0) AS seo_score,
    CASE
        WHEN COALESCE(p.seo_score, 0) >= 80 THEN '🟢 Ótimo'
        WHEN COALESCE(p.seo_score, 0) >= 60 THEN '🟡 Bom'
        WHEN COALESCE(p.seo_score, 0) >= 40 THEN '🟠 Regular'
        ELSE '🔴 Ruim'
    END AS seo_status,

    p.updated_at,
    p.seo_last_audit_at
FROM products p
LEFT JOIN suppliers s ON s.id = p.supplier_id
WHERE p.is_active  = true
  AND p.is_deleted = false
ORDER BY COALESCE(p.seo_score, 0) ASC, p.name;

COMMENT ON VIEW public.vw_products_seo_status IS
    'v3 — Dashboard visual SEO por produto. Inclui ai_title, ai_summary, schema_json, supplier_reference';

-- ============================================================
-- VIEW 5: vw_seo_dashboard  (melhorada: ai_title, schema_json)
-- ============================================================
CREATE VIEW public.vw_seo_dashboard AS
WITH product_stats AS (
    SELECT
        COUNT(*)                                                           AS total_products,
        COUNT(*) FILTER (WHERE slug IS NOT NULL AND LENGTH(TRIM(slug)) > 0) AS with_slug,
        COUNT(*) FILTER (WHERE meta_title IS NOT NULL AND LENGTH(TRIM(meta_title)) > 0) AS with_meta_title,
        COUNT(*) FILTER (WHERE meta_description IS NOT NULL AND LENGTH(TRIM(meta_description)) > 0) AS with_meta_description,
        COUNT(*) FILTER (WHERE LENGTH(COALESCE(description,'')) >= 300)     AS with_good_description,
        COUNT(*) FILTER (WHERE ai_summary IS NOT NULL AND LENGTH(TRIM(ai_summary)) > 0) AS with_ai_summary,
        COUNT(*) FILTER (WHERE ai_title IS NOT NULL AND LENGTH(TRIM(ai_title)) > 0) AS with_ai_title,
        COUNT(*) FILTER (WHERE schema_json IS NOT NULL)                     AS with_schema_json,
        ROUND(AVG(COALESCE(seo_score, 0)), 1)                              AS avg_seo_score,
        COUNT(*) FILTER (WHERE COALESCE(seo_score, 0) >= 80)               AS excellent_seo,
        COUNT(*) FILTER (WHERE COALESCE(seo_score, 0) >= 60 AND COALESCE(seo_score, 0) < 80) AS good_seo,
        COUNT(*) FILTER (WHERE COALESCE(seo_score, 0) >= 40 AND COALESCE(seo_score, 0) < 60) AS fair_seo,
        COUNT(*) FILTER (WHERE COALESCE(seo_score, 0) < 40)                AS poor_seo
    FROM products
    WHERE is_active = true AND is_deleted = false
),
category_stats AS (
    SELECT
        COUNT(*) AS total_categories,
        COUNT(*) FILTER (WHERE meta_title IS NOT NULL)       AS with_meta_title,
        COUNT(*) FILTER (WHERE meta_description IS NOT NULL) AS with_meta_description,
        COUNT(*) FILTER (WHERE ai_summary IS NOT NULL)       AS with_ai_summary
    FROM categories
    WHERE is_active = true
),
image_stats AS (
    SELECT
        COUNT(*) AS total_images,
        COUNT(*) FILTER (WHERE alt_text IS NOT NULL AND LENGTH(TRIM(alt_text)) > 0) AS with_alt_text
    FROM product_images
    WHERE is_active = true
)
SELECT
    'produtos'::text AS entidade,
    p.total_products AS total,
    ROUND(p.with_slug          * 100.0 / NULLIF(p.total_products, 0), 1) AS pct_com_slug,
    ROUND(p.with_meta_title    * 100.0 / NULLIF(p.total_products, 0), 1) AS pct_com_meta_title,
    ROUND(p.with_meta_description * 100.0 / NULLIF(p.total_products, 0), 1) AS pct_com_meta_description,
    ROUND(p.with_ai_title      * 100.0 / NULLIF(p.total_products, 0), 1) AS pct_com_ai_title,
    ROUND(p.with_ai_summary    * 100.0 / NULLIF(p.total_products, 0), 1) AS pct_com_ai_summary,
    ROUND(p.with_schema_json   * 100.0 / NULLIF(p.total_products, 0), 1) AS pct_com_schema_json,
    p.avg_seo_score                                                        AS score_medio,
    p.excellent_seo || ' 🟢 | ' || p.good_seo || ' 🟡 | ' || p.fair_seo || ' 🟠 | ' || p.poor_seo || ' 🔴' AS distribuicao_scores
FROM product_stats p

UNION ALL

SELECT
    'categorias'::text, c.total_categories,
    NULL, -- pct_com_slug
    ROUND(c.with_meta_title       * 100.0 / NULLIF(c.total_categories, 0), 1),
    ROUND(c.with_meta_description * 100.0 / NULLIF(c.total_categories, 0), 1),
    NULL, -- pct_com_ai_title
    ROUND(c.with_ai_summary       * 100.0 / NULLIF(c.total_categories, 0), 1),
    NULL, NULL, NULL
FROM category_stats c

UNION ALL

SELECT
    'imagens'::text, i.total_images,
    NULL, NULL, NULL, NULL,
    ROUND(i.with_alt_text * 100.0 / NULLIF(i.total_images, 0), 1),
    NULL, NULL,
    i.with_alt_text || ' de ' || i.total_images || ' com alt text'
FROM image_stats i;

COMMENT ON VIEW public.vw_seo_dashboard IS
    'v3 — Dashboard executivo: produtos, categorias, imagens. Inclui ai_title, ai_summary, schema_json coverage';
;
