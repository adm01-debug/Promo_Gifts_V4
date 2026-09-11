
-- ══════════════════════════════════════════════════════════════════
-- Melhoria 1: sku_promo — backfill 449 NULLs + trigger auto-sync
-- 
-- DESCOBERTA (sessão anterior): sku_promo = sku em 100% dos 7137
-- preenchidos. CHECK de igualdade já adicionado.
-- 
-- PLANO:
--   1A. Backfill: 449 NULLs → sku
--   1B. TRIGGER BEFORE INSERT/UPDATE: auto-define sku_promo = NEW.sku
--       Isso garante consistência sem quebrar pipelines que tentam
--       definir sku_promo (o trigger sobrescreverá com sku).
--   1C. NÃO usar GENERATED ALWAYS AS: triggers de pipeline escrevem
--       sku_promo e GENERATED bloquearia com erro.
-- ══════════════════════════════════════════════════════════════════

-- 1A: Backfill
SELECT set_config('app.write_source', 'pipeline', true);
UPDATE public.products
SET sku_promo = sku
WHERE sku_promo IS NULL;
SELECT set_config('app.write_source', 'ui', true);

-- 1B: Trigger function — auto-sync sku_promo = sku
CREATE OR REPLACE FUNCTION public.fn_sync_sku_promo()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  -- sku_promo é sempre igual ao sku (descoberto 2026-06-23, CHECK adicionado)
  -- Este trigger garante consistência automática sem precisar de GENERATED ALWAYS
  -- (GENERATED bloquearia pipelines de importação que tentam definir sku_promo)
  NEW.sku_promo := NEW.sku;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_sync_sku_promo() IS
'Auto-sync sku_promo = sku em todo INSERT/UPDATE. sku_promo é redundante com sku (100% iguais). Candidato a DROP após refatoração de gold-relations.ts e types.ts. 2026-06-23.';

-- 1C: Trigger em products
DROP TRIGGER IF EXISTS trg_sync_sku_promo ON public.products;
CREATE TRIGGER trg_sync_sku_promo
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_sku_promo();

COMMENT ON TRIGGER trg_sync_sku_promo ON public.products IS
'Auto-mantém sku_promo = sku. Criado 2026-06-23.';
;
