
-- ══════════════════════════════════════════════════════════════════
-- Melhoria 1: Corrigir 4 escalares com valores impossíveis
-- Causa: mm foram armazenados como cm (ex: 1303mm → 1303cm em vez de 13.03cm)
-- Fonte correta: dimensions jsonb (que tinha o valor em cm correto)
-- ══════════════════════════════════════════════════════════════════
SELECT set_config('app.write_source', 'pipeline', true);
SELECT set_config('app.bulk_import_mode', 'true', true);

-- 08351: Caneca térmica 750ml — esc_l=374cm → 14.5cm (374mm = 37.4mm ≠ 14.5cm → jsonb correto)
UPDATE public.products
SET length_cm = 14.5
WHERE sku = '08351'
  AND length_cm = 374
  AND (dimensions->>'length_cm')::numeric = 14.5;

-- 12262: Caneta plástica — esc_h=1303cm → 13.0cm
UPDATE public.products
SET height_cm = 13.0
WHERE sku = '12262'
  AND height_cm = 1303
  AND (dimensions->>'height_cm')::numeric = 13.0;

-- ER143B: Caneta metal — esc_w=330cm → 3.3cm e esc_h=1400cm → 14.0cm
UPDATE public.products
SET width_cm  = 3.3,
    height_cm = 14.0
WHERE sku = 'ER143B'
  AND width_cm  = 330
  AND height_cm = 1400
  AND (dimensions->>'width_cm')::numeric  = 3.3
  AND (dimensions->>'height_cm')::numeric = 14.0;

-- P$101075: Pisca-pisca 100L — esc_h=1045cm → 10.8cm
UPDATE public.products
SET height_cm = 10.8
WHERE sku = 'P$101075'
  AND height_cm = 1045
  AND (dimensions->>'height_cm')::numeric = 10.8;

SELECT set_config('app.write_source', 'ui', true);
SELECT set_config('app.bulk_import_mode', 'false', true);
;
