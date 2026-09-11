
-- ══════════════════════════════════════════════════════════════════
-- Melhoria 10: sku_promo COMMENT + CHECK de integridade
-- Descoberta: sku_promo = sku em 100% dos 7137 registros preenchidos.
-- É uma cópia redundante do SKU (legacy de outro sistema de gestão).
-- ══════════════════════════════════════════════════════════════════

-- 10A: CHECK — sku_promo deve ser NULL ou igual ao sku
ALTER TABLE public.products
  ADD CONSTRAINT chk_products_sku_promo_equals_sku
  CHECK (sku_promo IS NULL OR sku_promo = sku)
  NOT VALID;

ALTER TABLE public.products
  VALIDATE CONSTRAINT chk_products_sku_promo_equals_sku;

-- 10B: COMMENT documentando a descoberta
COMMENT ON COLUMN public.products.sku_promo IS
'SKU no sistema Promo (legacy). ATENÇÃO: 100% igual ao campo sku (7137/7137 registros).
Mantido por compatibilidade com: src/lib/external-db/types.ts, src/integrations/supabase/gold-relations.ts.
CHECK chk_products_sku_promo_equals_sku garante que nunca diverge de sku.
Candidato a DROP após refatoração dos tipos TypeScript.
2026-06-23: CHECK de igualdade adicionado + descoberta de redundância documentada.';
;
