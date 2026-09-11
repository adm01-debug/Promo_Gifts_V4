
-- ══════════════════════════════════════════════════════════════════
-- Melhoria 3: CHECKs adicionais em campos críticos
-- Todos validados com 0 violações existentes
-- ══════════════════════════════════════════════════════════════════

-- 3A: min_quantity >= 1 (quantidade mínima sempre positiva)
ALTER TABLE public.products
  ADD CONSTRAINT chk_products_min_quantity_pos
  CHECK (min_quantity IS NULL OR min_quantity >= 1)
  NOT VALID;
ALTER TABLE public.products VALIDATE CONSTRAINT chk_products_min_quantity_pos;

-- 3B: capacity_ml > 0 (para copos, garrafas — nunca zero ou negativo)
ALTER TABLE public.products
  ADD CONSTRAINT chk_products_capacity_ml_pos
  CHECK (capacity_ml IS NULL OR capacity_ml > 0)
  NOT VALID;
ALTER TABLE public.products VALIDATE CONSTRAINT chk_products_capacity_ml_pos;

-- 3C: lead_time_days >= 0 (prazo nunca negativo)
ALTER TABLE public.products
  ADD CONSTRAINT chk_products_lead_time_nonneg
  CHECK (lead_time_days IS NULL OR lead_time_days >= 0)
  NOT VALID;
ALTER TABLE public.products VALIDATE CONSTRAINT chk_products_lead_time_nonneg;

-- 3D: ipi_rate range 0-100% (taxa fiscal válida)
ALTER TABLE public.products
  ADD CONSTRAINT chk_products_ipi_rate_range
  CHECK (ipi_rate IS NULL OR (ipi_rate >= 0 AND ipi_rate <= 100))
  NOT VALID;
ALTER TABLE public.products VALIDATE CONSTRAINT chk_products_ipi_rate_range;

-- 3E: circumference_cm > 0 quando preenchido
ALTER TABLE public.products
  ADD CONSTRAINT chk_products_circumference_pos
  CHECK (circumference_cm IS NULL OR circumference_cm > 0)
  NOT VALID;
ALTER TABLE public.products VALIDATE CONSTRAINT chk_products_circumference_pos;
;
