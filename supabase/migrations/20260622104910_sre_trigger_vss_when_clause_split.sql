
-- MELHORIA 3: Separar trigger em INSERT + UPDATE com WHEN clause cirúrgica
-- Objetivo: eliminar disparos desnecessários em updates de cost_price, quantity, sync_status, etc.

-- Remover trigger unificado
DROP TRIGGER IF EXISTS trg_capture_supplier_promise ON public.variant_supplier_sources;

-- Trigger 1: INSERT — sempre captura (novo source pode já ter promessa)
DROP TRIGGER IF EXISTS trg_csp_insert ON public.variant_supplier_sources;
CREATE TRIGGER trg_csp_insert
  AFTER INSERT ON public.variant_supplier_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_capture_supplier_promise();

-- Trigger 2: UPDATE — SOMENTE quando colunas de promessa realmente mudam
-- Isso elimina disparos em: cost_price, quantity, sync_status, supplier_sku, etc.
DROP TRIGGER IF EXISTS trg_csp_update ON public.variant_supplier_sources;
CREATE TRIGGER trg_csp_update
  AFTER UPDATE ON public.variant_supplier_sources
  FOR EACH ROW
  WHEN (
    OLD.next_date_1     IS DISTINCT FROM NEW.next_date_1     OR
    OLD.next_quantity_1 IS DISTINCT FROM NEW.next_quantity_1 OR
    OLD.next_date_2     IS DISTINCT FROM NEW.next_date_2     OR
    OLD.next_quantity_2 IS DISTINCT FROM NEW.next_quantity_2 OR
    OLD.next_date_3     IS DISTINCT FROM NEW.next_date_3     OR
    OLD.next_quantity_3 IS DISTINCT FROM NEW.next_quantity_3 OR
    OLD.next_date_4     IS DISTINCT FROM NEW.next_date_4     OR
    OLD.next_quantity_4 IS DISTINCT FROM NEW.next_quantity_4 OR
    OLD.next_date_5     IS DISTINCT FROM NEW.next_date_5     OR
    OLD.next_quantity_5 IS DISTINCT FROM NEW.next_quantity_5 OR
    OLD.next_date_6     IS DISTINCT FROM NEW.next_date_6     OR
    OLD.next_quantity_6 IS DISTINCT FROM NEW.next_quantity_6 OR
    OLD.supplier_id     IS DISTINCT FROM NEW.supplier_id     OR
    OLD.variant_id      IS DISTINCT FROM NEW.variant_id
  )
  EXECUTE FUNCTION public.fn_capture_supplier_promise();
;
