CREATE OR REPLACE FUNCTION public.fn_trigger_sync_product_status_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  -- Sync is_deleted -> deleted_at
  IF NEW.is_deleted IS DISTINCT FROM OLD.is_deleted THEN
    IF NEW.is_deleted = true AND NEW.deleted_at IS NULL THEN
      NEW.deleted_at := NOW();
    ELSIF NEW.is_deleted = false THEN
      NEW.deleted_at := NULL;
    END IF;
  ELSIF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    NEW.is_deleted := (NEW.deleted_at IS NOT NULL);
  END IF;

  -- INVARIANT: deleted products MUST be inactive
  -- Se is_deleted=true, forçar is_active=false (sem bloqueio por trigger de deactivation,
  -- pois a deleção já é um passo mais grave que a desativação)
  IF NEW.is_deleted = true AND NEW.is_active = true THEN
    NEW.is_active := false;
  END IF;

  RETURN NEW;
END;
$function$
