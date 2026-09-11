
WITH cor_type AS (
  SELECT id FROM variation_types
  WHERE code = 'COR' AND organization_id = '5db5aee1-064b-4ef4-9193-345dcd8274ea'
),
cleaned_names AS (
  SELECT
    sc.id AS supplier_color_id,
    LOWER(TRIM(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          UNACCENT(
            REGEXP_REPLACE(
              REGEXP_REPLACE(sc.name, '\s*#[^\s]*', '', 'g'),
              '\s*\([^)]*\)', '', 'g'
            )
          ),
        '[^a-zA-Z0-9\s]', '', 'g'),
      '\s+', '-', 'g')
    )) AS slug,
    TRIM(
      REGEXP_REPLACE(
        REGEXP_REPLACE(sc.name, '\s*#[^\s]*', '', 'g'),
        '\s*\([^)]*\)', '', 'g'
      )
    ) AS clean_name,
    sc.hex_code
  FROM supplier_colors sc
),
canonical_per_slug AS (
  SELECT DISTINCT ON (slug)
    slug,
    INITCAP(MIN(clean_name) OVER (PARTITION BY slug)) AS canonical_label
  FROM cleaned_names
  WHERE slug IS NOT NULL AND LENGTH(slug) > 0
  ORDER BY slug
)
INSERT INTO variation_values (variation_type_id, value, label, organization_id, sort_order, is_active)
SELECT
  cor_type.id,
  c.slug,
  c.canonical_label,
  '5db5aee1-064b-4ef4-9193-345dcd8274ea',
  100,
  true
FROM canonical_per_slug c, cor_type
ON CONFLICT (organization_id, variation_type_id, value) DO UPDATE
  SET label = EXCLUDED.label,
      updated_at = NOW();
;
