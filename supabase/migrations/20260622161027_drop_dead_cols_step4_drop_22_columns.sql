
-- MELHORIA 1 · PASSO 4/5 — DROP das 22 colunas mortas de products
-- ─────────────────────────────────────────────────────────────────
-- Bucket B (valores constantes, nunca usados):
-- is_on_sale (7591×false), is_on_sale_expires_at (7591×NULL),
-- is_online_exclusive (7591×false), has_inner_cradle (7591×false),
-- requires_minimum_order (7591×true), created_by (7591×NULL), updated_by (7591×NULL)
--
-- Bucket D (100% NULL, zero refs):
-- auto_category, catalog_page, classification_confidence, cradle_material,
-- ean, external_id, freight_class, gtin, internal_diameter_cm,
-- key_benefits, manufacturer_sku, packaging_color, packaging_finish,
-- use_cases, warranty_months

ALTER TABLE public.products
  DROP COLUMN IF EXISTS is_on_sale,
  DROP COLUMN IF EXISTS is_on_sale_expires_at,
  DROP COLUMN IF EXISTS is_online_exclusive,
  DROP COLUMN IF EXISTS has_inner_cradle,
  DROP COLUMN IF EXISTS requires_minimum_order,
  DROP COLUMN IF EXISTS created_by,
  DROP COLUMN IF EXISTS updated_by,
  DROP COLUMN IF EXISTS auto_category,
  DROP COLUMN IF EXISTS catalog_page,
  DROP COLUMN IF EXISTS classification_confidence,
  DROP COLUMN IF EXISTS cradle_material,
  DROP COLUMN IF EXISTS ean,
  DROP COLUMN IF EXISTS external_id,
  DROP COLUMN IF EXISTS freight_class,
  DROP COLUMN IF EXISTS gtin,
  DROP COLUMN IF EXISTS internal_diameter_cm,
  DROP COLUMN IF EXISTS key_benefits,
  DROP COLUMN IF EXISTS manufacturer_sku,
  DROP COLUMN IF EXISTS packaging_color,
  DROP COLUMN IF EXISTS packaging_finish,
  DROP COLUMN IF EXISTS use_cases,
  DROP COLUMN IF EXISTS warranty_months;
;
