
-- ============================================================
-- BUG: 5 produtos XBZ-MANUAL com is_deleted=true E is_active=true
-- Violação da invariant: deleted → inactive
-- Causa raiz: fn_trigger_sync_product_status_fields não sincroniza
--   is_deleted → is_active. Apenas sincroniza is_deleted ↔ deleted_at.
-- Impacto: esses produtos apareciam em consultas que filtram is_active=true
--   mas não checam is_deleted (e.g. supabase queries sem filter deleted)
-- ============================================================

-- STEP 1: Corrigir os 5 produtos violadores
-- (requer deactivation_approved pois o trigger bloqueia is_active→false)
SELECT set_config('app.deactivation_approved', 'true', true);
SELECT set_config('app.write_source', 'migration', true);

UPDATE products
SET is_active = false
WHERE is_deleted = true AND is_active = true;

-- STEP 2: Atualizar trigger para enforçar deleted → inactive
CREATE OR REPLACE FUNCTION public.fn_trigger_sync_product_status_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
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
$$;

-- STEP 3: Verificação pós-fix
SELECT COUNT(*) AS remaining_violations
FROM products
WHERE is_deleted = true AND is_active = true;
;
