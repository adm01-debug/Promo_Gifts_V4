
WITH computed AS (
  SELECT
    sc.id AS sc_id,
    LOWER(TRIM(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          UNACCENT(
            REPLACE(
              REGEXP_REPLACE(
                REGEXP_REPLACE(sc.name, '\s*#[^\s]*', '', 'g'),
                '\s*\([^)]*\)', '', 'g'
              ),
              '/', ' '
            )
          ),
          '[^a-zA-Z0-9\s]', '', 'g'
        ),
        '\s+', '-', 'g'
      )
    )) AS cslug
  FROM supplier_colors sc
  WHERE sc.color_variation_id IS NULL
),
best_match AS (
  SELECT DISTINCT ON (c.sc_id)
    c.sc_id,
    cv.id AS cv_id
  FROM computed c
  JOIN color_variations cv ON (
    c.cslug = cv.slug
    OR c.cslug LIKE cv.slug || '-%'
  )
  WHERE c.cslug IS NOT NULL AND c.cslug != ''
  ORDER BY
    c.sc_id,
    CASE WHEN c.cslug = cv.slug THEN 1 ELSE 2 END,
    LENGTH(cv.slug) DESC
)
UPDATE supplier_colors sc
SET color_variation_id = bm.cv_id,
    updated_at = NOW()
FROM best_match bm
WHERE sc.id = bm.sc_id;
;
