
-- ================================================================
-- MELHORIA-05: Trigger automático — produto desativado → PAT desativada
-- Previne reacúmulo do problema da MELHORIA-04 no futuro.
-- ================================================================
CREATE OR REPLACE FUNCTION public.fn_sync_pat_on_product_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só age quando is_active muda
  IF NEW.is_active = OLD.is_active THEN
    RETURN NEW;
  END IF;

  IF NEW.is_active = false THEN
    -- Produto desativado: desativar todas as PATs
    UPDATE public.print_area_techniques
    SET is_active = false, updated_at = now()
    WHERE product_id = NEW.id AND is_active = true;
  END IF;
  -- Nota: NÃO reativamos PATs ao reativar produto —
  -- reativação é intencional e manual (controle de qualidade)

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_pat_on_product_deactivate ON public.products;
CREATE TRIGGER trg_sync_pat_on_product_deactivate
  AFTER UPDATE OF is_active ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_pat_on_product_status_change();

-- Confirmar criação
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trg_sync_pat_on_product_deactivate';
;
