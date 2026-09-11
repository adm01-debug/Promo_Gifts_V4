
-- ============================================================
-- FIX 4: Defaults inconsistentes
-- source_supplier DEFAULT 'stricker' (minúscula, nome antigo)
-- supplier_code DEFAULT 'SPOT' (herdado do primeiro fornecedor)
-- Ambos são sempre normalizados pelo trigger fn_normalize_source_supplier,
-- mas o DEFAULT imprime um valor errado se o trigger for desabilitado.
-- Fix: DEFAULT NULL em ambos — o trigger é quem deve definir o valor.
-- ============================================================

-- Remover DEFAULT confuso de source_supplier ('stricker' → sem default)
ALTER TABLE public.product_images
  ALTER COLUMN source_supplier DROP DEFAULT;

-- Remover DEFAULT genérico de supplier_code ('SPOT' → sem default)
ALTER TABLE public.product_images
  ALTER COLUMN supplier_code DROP DEFAULT;

-- Adicionar comentários documentando que o trigger normaliza
COMMENT ON COLUMN public.product_images.source_supplier IS
  'Fornecedor de origem. Sempre normalizado pelo trigger fn_normalize_source_supplier
   para: SPOT, XBZ, ASIA, SOMARCAS, 88BRINDES. Sem DEFAULT — trigger define o valor.
   Antigo DEFAULT stricker removido em 2026-06-15.';

COMMENT ON COLUMN public.product_images.supplier_code IS
  'Código do fornecedor (igual a source_supplier na maioria dos casos).
   Sem DEFAULT — trigger fn_normalize_source_supplier define o valor.
   Antigo DEFAULT SPOT removido em 2026-06-15.';
;
