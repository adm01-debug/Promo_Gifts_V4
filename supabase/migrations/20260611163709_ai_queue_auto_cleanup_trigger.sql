
-- MELHORIA PREVENTIVA: trigger para limpar fila quando produto é desativado/deletado
CREATE OR REPLACE FUNCTION public.fn_cleanup_ai_queue_on_product_deactivate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
    -- Se produto foi desativado ou deletado, remover da fila pending/error
    IF (NEW.is_active = false OR NEW.is_deleted = true)
       AND (OLD.is_active = true AND OLD.is_deleted = false) THEN
        DELETE FROM ai_enrichment_queue
        WHERE product_id = NEW.id
          AND status IN ('pending', 'error');
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_ai_queue ON products;
CREATE TRIGGER trg_cleanup_ai_queue
    AFTER UPDATE OF is_active, is_deleted ON products
    FOR EACH ROW
    EXECUTE FUNCTION fn_cleanup_ai_queue_on_product_deactivate();

COMMENT ON TRIGGER trg_cleanup_ai_queue ON products IS
    'Remove automaticamente da ai_enrichment_queue itens pending/error quando produto é desativado ou deletado.';
;
