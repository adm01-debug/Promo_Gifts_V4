
-- ===== Pai: alinhar timestamps ao status (SSOT = status) =====
CREATE OR REPLACE FUNCTION public.fn_pad_sync_status() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'standardized' AND NEW.standardized_at IS NULL THEN
    NEW.standardized_at := now();
  END IF;
  IF NEW.product_id IS NOT NULL AND NEW.promoted_at IS NULL THEN
    NEW.promoted_at := now();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_aa_pad_sync_status ON public.produtos_padronizacao;
CREATE TRIGGER trg_aa_pad_sync_status BEFORE INSERT OR UPDATE ON public.produtos_padronizacao
FOR EACH ROW EXECUTE FUNCTION public.fn_pad_sync_status();

-- ===== Variante: resolver pad_id pelo parent_reference + carimbar status =====
CREATE OR REPLACE FUNCTION public.fn_padvar_sync() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- vínculo forte com o pai: se pad_id não veio, tenta resolver pelo par (supplier_id, parent_reference)
  IF NEW.pad_id IS NULL AND NEW.parent_reference IS NOT NULL THEN
    SELECT p.id INTO NEW.pad_id
    FROM public.produtos_padronizacao p
    WHERE p.supplier_id = NEW.supplier_id AND p.supplier_reference = NEW.parent_reference
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_aa_padvar_sync ON public.produtos_padronizacao_variantes;
CREATE TRIGGER trg_aa_padvar_sync BEFORE INSERT OR UPDATE ON public.produtos_padronizacao_variantes
FOR EACH ROW EXECUTE FUNCTION public.fn_padvar_sync();

-- Backfill: resolve pad_id onde estiver nulo e for casável (idempotente; dispara o trigger)
UPDATE public.produtos_padronizacao_variantes SET pad_id = pad_id
WHERE pad_id IS NULL AND parent_reference IS NOT NULL;
;
