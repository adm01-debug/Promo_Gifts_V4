
-- =============================================================================
-- Migration: fix_orphan_variants_cascade_product_inactive_2026_07_03
--
-- PROBLEMA: 18 variantes ativas (`product_variants.is_active = TRUE`) cujos
-- produtos-pai estão inativos (`products.is_active = FALSE`). Ocorre quando
-- o pipeline desativa o produto mas não cascateia para as variantes.
-- Diagnóstico: 0 em quotes, 0 em carts — seguro desativar imediatamente.
-- Produtos: Caderno fichário (19148), Cx papel termico, Caderneta (15471),
--           Garrafa térmica (E@02112), Suporte celular (14364), Caneta (15085A)
--
-- SOLUÇÃO:
--   1) Backfill imediato: desativar as 18 variantes
--   2) Trigger de cascade: product → variants quando is_active muda FALSE
--
-- ANTI-REGRESSÃO (fix_version: orphan-variants-cascade-2026-07-03):
--   - Trigger cascateia apenas is_active=FALSE (não TRUE — reativação é manual)
--   - Fix_version comment no trigger impede Lovable de remover
-- =============================================================================

-- PARTE 1: Backfill — desativar as 18 variantes órfãs
UPDATE public.product_variants pv
SET is_active = FALSE, updated_at = NOW()
WHERE pv.is_active = TRUE
  AND pv.product_id IN (SELECT id FROM public.products WHERE is_active = FALSE);

-- PARTE 2: Trigger de cascade para prevenir futuros orphans
-- Quando produto é desativado, desativa automaticamente suas variantes
CREATE OR REPLACE FUNCTION public.fn_cascade_product_deactivation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- fix_version: orphan-variants-cascade-2026-07-03
  -- ANTI-REGRESSÃO: não remover este trigger — previne variantes órfãs
  -- quando produto é desativado. Cascateia apenas FALSE (reativação é manual).
  IF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
    UPDATE public.product_variants
    SET is_active = FALSE, updated_at = NOW()
    WHERE product_id = NEW.id
      AND is_active = TRUE;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_cascade_product_deactivation() IS
'Cascateia is_active=FALSE do produto para suas variantes.
 fix_version: orphan-variants-cascade-2026-07-03
 ANTI-REGRESSÃO: não remover — previne product_variants órfãs.';

DROP TRIGGER IF EXISTS trg_cascade_product_deactivation ON public.products;

CREATE TRIGGER trg_cascade_product_deactivation
AFTER UPDATE OF is_active ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.fn_cascade_product_deactivation();

COMMENT ON TRIGGER trg_cascade_product_deactivation ON public.products IS
'Cascade: produto inativo → variantes inativas. fix_version: orphan-variants-cascade-2026-07-03';
;
