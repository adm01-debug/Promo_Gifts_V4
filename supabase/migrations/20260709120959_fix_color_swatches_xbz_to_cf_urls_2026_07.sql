
-- Migration: fix_color_swatches_xbz_to_cf_urls_2026_07
-- @fix_version cors-bounds-xbz-2026-07
-- ANTI-REGRESSÃO: não reverter.
-- Atualiza color_swatches.image_url de CDN XBZ para Cloudflare Images quando
-- o product_variants correspondente tem selected_thumbnail verificado no CF.
-- 179 swatches XBZ total; 72 atualizáveis para CF (107 sem equivalente CF).
--
-- Condições de segurança:
--   1. Só atualiza quando product_variants.selected_thumbnail contém imagedelivery.net
--   2. Fallback: mantém URL XBZ quando não há CF disponível
--   3. Idempotente: segundo run não muda nada (JSONB já conterá CF URL)
--   4. Usa jsonb_agg com jsonb_array_elements — safe para arrays vazios/nulos

UPDATE products p
SET color_swatches = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'image_url' LIKE '%cdn.xbzbrindes.com.br%' THEN
        COALESCE(
          -- Tenta substituir pela URL CF da variante correspondente
          (
            SELECT elem || jsonb_build_object('image_url', pv2.selected_thumbnail)
            FROM product_variants pv2
            WHERE pv2.product_id = p.id
              AND pv2.color_name = elem->>'color_name'
              AND pv2.selected_thumbnail LIKE '%imagedelivery.net%'
            LIMIT 1
          ),
          elem  -- mantém XBZ se não tem CF
        )
      ELSE elem  -- sem XBZ, não altera
    END
    ORDER BY (elem->>'display_order')::int NULLS LAST
  )
  FROM jsonb_array_elements(
    CASE jsonb_typeof(p.color_swatches)
      WHEN 'array' THEN p.color_swatches
      ELSE '[]'::jsonb
    END
  ) elem
)
WHERE p.is_active = true
  AND jsonb_typeof(p.color_swatches) = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p.color_swatches) cs
    WHERE cs->>'image_url' LIKE '%cdn.xbzbrindes.com.br%'
  );

-- Validação pós-update: verificar que não introduzimos NULLs inesperados
DO $$
DECLARE
  null_swatches_after int;
  xbz_remaining int;
BEGIN
  SELECT COUNT(*) INTO null_swatches_after
  FROM products
  WHERE is_active = true
    AND color_swatches IS NULL
    AND has_colors = true;

  IF null_swatches_after > 5 THEN
    RAISE EXCEPTION 'ROLLBACK SAFETY: color_swatches NULL count inesperado: %', null_swatches_after;
  END IF;

  SELECT COUNT(*)
  INTO xbz_remaining
  FROM products p,
       jsonb_array_elements(CASE jsonb_typeof(p.color_swatches) WHEN 'array' THEN p.color_swatches ELSE '[]'::jsonb END) cs
  WHERE p.is_active = true
    AND cs->>'image_url' LIKE '%cdn.xbzbrindes.com.br%';

  RAISE NOTICE 'Migração color_swatches concluída. XBZ restantes: % (esperado ~107, sem CF equivalente)', xbz_remaining;
END $$;
;
