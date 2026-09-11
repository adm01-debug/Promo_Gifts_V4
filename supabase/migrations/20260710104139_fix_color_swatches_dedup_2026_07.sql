
-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION: fix_color_swatches_dedup_2026_07
--
-- BUG: 11 produtos têm entradas duplicadas em color_swatches JSONB
-- (mesmo color_name + image_url aparece 2x no array)
-- CAUSA: pipeline XBZ inseriu duplicatas antes de nossas migrações
-- FIX: deduplicar preservando primeiro elemento de cada par único
-- ═══════════════════════════════════════════════════════════════════

UPDATE products p
SET color_swatches = (
  SELECT jsonb_agg(cs ORDER BY cs_idx)
  FROM (
    SELECT DISTINCT ON (cs->>'color_name', cs->>'image_url')
      cs, ordinality AS cs_idx
    FROM jsonb_array_elements(p.color_swatches) WITH ORDINALITY AS arr(cs, ordinality)
    ORDER BY cs->>'color_name', cs->>'image_url', ordinality
  ) deduped
),
updated_at = NOW()
WHERE p.is_active = true
  AND p.sku_promo IN (
    SELECT DISTINCT sku_promo FROM products p2,
      jsonb_array_elements(CASE jsonb_typeof(p2.color_swatches) WHEN 'array' THEN p2.color_swatches ELSE '[]'::jsonb END) cs2
    WHERE p2.is_active=true AND cs2->>'image_url' IS NOT NULL AND cs2->>'color_name' IS NOT NULL
    GROUP BY p2.id, p2.sku_promo, cs2->>'color_name', cs2->>'image_url'
    HAVING COUNT(*)>1
  );
;
