-- Adicionar CHECK warranty_months >= 0 OR NULL
-- fix_version: warranty_check_20260627
-- Motivo: consistência com lead_time_days (chk_products_lead_time_nonneg)
-- Dados: 0 produtos com warranty_months < 0 (verificado pré-migration)
ALTER TABLE public.products
  ADD CONSTRAINT chk_products_warranty_months_nonneg
  CHECK (warranty_months IS NULL OR warranty_months >= 0);;
