
-- ============================================================
-- FIX GAP T5.06: Trigger trg_sync_novelty_expires_at
-- Expandir para também cobrir INSERT (não só UPDATE)
-- Problema: INSERT com novelty_expires_at definido não propagava
-- para is_new_expires_at (trigger era apenas BEFORE UPDATE)
-- ============================================================

-- Atualizar função para lidar com INSERT e UPDATE
CREATE OR REPLACE FUNCTION public.fn_sync_novelty_expires_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- INSERT: se novelty_expires_at foi fornecido, propagar para is_new_expires_at
  IF TG_OP = 'INSERT' THEN
    IF NEW.novelty_expires_at IS NOT NULL AND NEW.is_new_expires_at IS NULL THEN
      NEW.is_new_expires_at := NEW.novelty_expires_at;
    ELSIF NEW.is_new_expires_at IS NOT NULL AND NEW.novelty_expires_at IS NULL THEN
      NEW.novelty_expires_at := NEW.is_new_expires_at;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: sincronização bidirecional
  IF TG_OP = 'UPDATE' THEN
    -- Se novelty_expires_at mudou, propaga para is_new_expires_at
    IF NEW.novelty_expires_at IS DISTINCT FROM OLD.novelty_expires_at THEN
      NEW.is_new_expires_at := NEW.novelty_expires_at;
    END IF;
    -- Se is_new_expires_at mudou E novelty não mudou → propaga inverso
    IF NEW.is_new_expires_at IS DISTINCT FROM OLD.is_new_expires_at
       AND NEW.novelty_expires_at IS NOT DISTINCT FROM OLD.novelty_expires_at THEN
      NEW.novelty_expires_at := NEW.is_new_expires_at;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Recriar trigger cobrindo INSERT E UPDATE
DROP TRIGGER IF EXISTS trg_sync_novelty_expires_at ON public.products;

CREATE TRIGGER trg_sync_novelty_expires_at
  BEFORE INSERT OR UPDATE OF novelty_expires_at, is_new_expires_at
  ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_novelty_expires_at();

COMMENT ON FUNCTION public.fn_sync_novelty_expires_at() IS
'Sincroniza novelty_expires_at ↔ is_new_expires_at em INSERT e UPDATE. novelty_expires_at é a coluna canônica.';
;
