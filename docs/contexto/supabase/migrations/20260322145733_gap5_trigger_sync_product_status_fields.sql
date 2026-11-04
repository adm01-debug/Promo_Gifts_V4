-- =================================================================
-- GAP 5 FIX: Trigger para manter campos de status sincronizados
-- Canônico: is_active, is_deleted
-- Legacy: active, deleted_at
-- Direção: is_active → active, is_deleted → deleted_at
-- Criado em: 2026-03-22
-- =================================================================

CREATE OR REPLACE FUNCTION fn_trigger_sync_product_status_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Sync is_active → active
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    NEW.active := NEW.is_active;
  ELSIF NEW.active IS DISTINCT FROM OLD.active THEN
    -- Se alguém mudou active diretamente, propagar para is_active
    NEW.is_active := NEW.active;
  END IF;

  -- Sync is_deleted → deleted_at
  IF NEW.is_deleted IS DISTINCT FROM OLD.is_deleted THEN
    IF NEW.is_deleted = true AND NEW.deleted_at IS NULL THEN
      NEW.deleted_at := NOW();
    ELSIF NEW.is_deleted = false THEN
      NEW.deleted_at := NULL;
    END IF;
  ELSIF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    -- Se alguém mudou deleted_at diretamente, propagar para is_deleted
    NEW.is_deleted := (NEW.deleted_at IS NOT NULL);
  END IF;

  RETURN NEW;
END;
$function$;

-- BEFORE UPDATE para modificar NEW antes de gravar
CREATE TRIGGER trg_sync_product_status_fields
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION fn_trigger_sync_product_status_fields();

COMMENT ON FUNCTION fn_trigger_sync_product_status_fields() IS 
'Mantém campos de status sincronizados: is_active↔active, is_deleted↔deleted_at.
Campos canônicos: is_active (70+ functions), is_deleted (11+ functions).
Campos legacy: active (4 views packaging), deleted_at (7 functions).';
