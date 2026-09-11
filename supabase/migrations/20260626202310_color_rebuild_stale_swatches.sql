-- Produtos cujo conjunto de color_ids no color_swatches != conjunto de color_ids das variantes ativas (cache stale,
-- variantes adicionadas/alteradas sem disparar rebuild — ex.: bulk import). Regenera via builder oficial fn_rebuild_color_swatches.
-- Idempotente; só atinge os stale. Garante 1 chip por cor real da variante.
UPDATE products p SET color_swatches = public.fn_rebuild_color_swatches(p.id)
WHERE p.is_active
  AND (SELECT array_agg(DISTINCT v.color_id::text ORDER BY v.color_id::text) FROM product_variants v WHERE v.product_id=p.id AND v.is_active AND v.color_id IS NOT NULL) IS NOT NULL
  AND COALESCE((SELECT array_agg(DISTINCT (s->>'color_id') ORDER BY (s->>'color_id')) FROM jsonb_array_elements(p.color_swatches) s WHERE jsonb_typeof(p.color_swatches)='array' AND (s->>'color_id') IS NOT NULL),'{}'::text[])
      IS DISTINCT FROM COALESCE((SELECT array_agg(DISTINCT v.color_id::text ORDER BY v.color_id::text) FROM product_variants v WHERE v.product_id=p.id AND v.is_active AND v.color_id IS NOT NULL),'{}'::text[]);;
