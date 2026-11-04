-- ============================================================
-- ONDA 1B-prep: Recriar views que referenciam image_url e is_deleted
-- ============================================================

-- 1. Drop views em cascata (vw_sitemap_all depende de vw_sitemap_products)
DROP VIEW IF EXISTS vw_sitemap_all;
DROP VIEW IF EXISTS vw_sitemap_products;
DROP VIEW IF EXISTS vw_products_commercial_packing;

-- 2. Recriar vw_sitemap_products (trocando COALESCE(primary_image_url, image_url) → primary_image_url)
CREATE VIEW vw_sitemap_products AS
SELECT 
  'product'::text AS url_type,
  ('/produto/'::text || COALESCE(slug, id::text)) AS url_path,
  COALESCE(slug, id::text) AS identifier,
  name AS title,
  updated_at AS lastmod,
  CASE
    WHEN is_featured = true THEN 1.0
    WHEN is_bestseller = true THEN 0.9
    WHEN is_new = true THEN 0.8
    ELSE 0.7
  END AS priority,
  CASE
    WHEN is_featured = true OR is_bestseller = true THEN 'daily'::text
    ELSE 'weekly'::text
  END AS changefreq,
  primary_image_url AS image_url,
  COALESCE(meta_title, name) AS image_title,
  COALESCE(seo_score, 50) AS seo_score
FROM products
WHERE is_active = true
  AND (robots_meta IS NULL OR robots_meta NOT LIKE '%noindex%')
ORDER BY
  CASE
    WHEN is_featured = true THEN 1.0
    WHEN is_bestseller = true THEN 0.9
    WHEN is_new = true THEN 0.8
    ELSE 0.7
  END DESC,
  updated_at DESC;

-- 3. Recriar vw_sitemap_all (depende de vw_sitemap_products + vw_sitemap_categories)
CREATE VIEW vw_sitemap_all AS
SELECT url_type, url_path, identifier, title, lastmod, priority, changefreq, image_url
FROM vw_sitemap_products
UNION ALL
SELECT url_type, url_path, identifier, title, lastmod, priority, changefreq, image_url
FROM vw_sitemap_categories;

-- 4. Recriar vw_products_commercial_packing (trocando p.image_url → p.primary_image_url)
CREATE VIEW vw_products_commercial_packing AS
SELECT 
  p.id,
  p.sku,
  p.name,
  p.slug,
  p.packing_type,
  p.packing_classification,
  p.has_gift_box,
  p.sale_price,
  p.cost_price,
  p.category_id,
  c.name AS category_name,
  c.slug AS category_slug,
  p.supplier_id,
  s.name AS supplier_name,
  p.primary_image_url AS image_url,
  p.is_active,
  p.is_new,
  CASE
    WHEN p.packing_type::text ILIKE '%caixa%' THEN 'box'::text
    WHEN p.packing_type::text ILIKE '%estojo%' THEN 'case'::text
    WHEN p.packing_type::text ILIKE '%bolsa%' THEN 'pouch'::text
    ELSE 'other'::text
  END AS packing_icon,
  CASE
    WHEN p.packing_type::text ILIKE '%oferta%' OR p.packing_type::text ILIKE '%presente%' THEN true
    ELSE false
  END AS is_gift_ready
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN suppliers s ON p.supplier_id = s.id
WHERE p.packing_classification::text = 'commercial' AND p.is_active = true;
