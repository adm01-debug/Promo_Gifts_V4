-- ============================================================
-- ONDA 1A: DROP colunas mortas de product_variants
-- 12 colunas com 0% de dados reais, zero dependências
-- Data: 23/03/2026
-- ============================================================

ALTER TABLE product_variants
  DROP COLUMN IF EXISTS selected_images,
  DROP COLUMN IF EXISTS selected_videos,
  DROP COLUMN IF EXISTS capacity,
  DROP COLUMN IF EXISTS capacity_display,
  DROP COLUMN IF EXISTS weight_g,
  DROP COLUMN IF EXISTS length_mm,
  DROP COLUMN IF EXISTS width_mm,
  DROP COLUMN IF EXISTS height_mm,
  DROP COLUMN IF EXISTS length_cm,
  DROP COLUMN IF EXISTS width_cm,
  DROP COLUMN IF EXISTS ean,
  DROP COLUMN IF EXISTS web_sku;
