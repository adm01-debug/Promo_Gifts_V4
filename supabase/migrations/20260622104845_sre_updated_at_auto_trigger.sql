
-- MELHORIA 2: Auto-trigger updated_at para supplier_replenishment_events
-- Reutiliza o padrão do projeto (trg_fn_set_updated_at já existe em variant_supplier_sources)
-- Cria versão própria para ser explícito e independente

CREATE OR REPLACE FUNCTION public.fn_sre_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_sre_set_updated_at() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sre_updated_at ON public.supplier_replenishment_events;
CREATE TRIGGER trg_sre_updated_at
  BEFORE UPDATE ON public.supplier_replenishment_events
  FOR EACH ROW EXECUTE FUNCTION public.fn_sre_set_updated_at();

NOTIFY pgrst, 'reload schema';
;
