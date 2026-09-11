-- ============================================================
-- FIX: Remover cláusula IS NULL morta do check constraint.
-- Após sku_promo = NOT NULL (migration anterior) + sku = NOT NULL (migration acima),
-- a condição "sku_promo IS NULL" nunca pode ser verdadeira.
-- CHECK antigo: (sku_promo IS NULL) OR (sku_promo::text = sku)
-- CHECK novo:   sku_promo::text = sku
-- Equivalente em prática, mas o novo é mais rigoroso e explícito.
-- Pré-condição: 0 violações do novo CHECK verificadas em dry-run.
-- fix_version: v20260627_sku_promo_check_cleanup
-- anti-regression: bot Lovable pode reintroduzir IS NULL — monitorar.
-- ============================================================
ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_products_sku_promo_equals_sku;
ALTER TABLE products ADD CONSTRAINT chk_products_sku_promo_equals_sku
  CHECK (sku_promo::text = sku);;
