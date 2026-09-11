
-- ============================================================
-- FIX P2-B: Trigger para manter is_new_expires_at em sync com
-- novelty_expires_at (canonical) — eliminar divergências futuras
-- novelty_expires_at = coluna canônica
-- is_new_expires_at = cópia de compatibilidade (sync automático)
-- ============================================================

-- 1) Função de trigger de sincronização
CREATE OR REPLACE FUNCTION public.fn_sync_novelty_expires_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se novelty_expires_at foi alterado, propaga para is_new_expires_at
  IF NEW.novelty_expires_at IS DISTINCT FROM OLD.novelty_expires_at THEN
    NEW.is_new_expires_at := NEW.novelty_expires_at;
  END IF;
  -- Se is_new_expires_at foi alterado E novelty_expires_at não mudou,
  -- propaga is_new_expires_at → novelty_expires_at (bidirecional)
  IF NEW.is_new_expires_at IS DISTINCT FROM OLD.is_new_expires_at
     AND NEW.novelty_expires_at IS NOT DISTINCT FROM OLD.novelty_expires_at THEN
    NEW.novelty_expires_at := NEW.is_new_expires_at;
  END IF;
  RETURN NEW;
END;
$$;

-- 2) Registrar trigger BEFORE UPDATE na tabela products
DROP TRIGGER IF EXISTS trg_sync_novelty_expires_at ON public.products;

CREATE TRIGGER trg_sync_novelty_expires_at
  BEFORE UPDATE OF novelty_expires_at, is_new_expires_at
  ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_novelty_expires_at();

-- 3) Comentário documentando a relação canônica
COMMENT ON COLUMN public.products.novelty_expires_at IS
'CANÔNICA: data de expiração da novidade. Sincronizada bidirecional com is_new_expires_at via trigger trg_sync_novelty_expires_at. Alterar qualquer uma propaga para a outra.';

COMMENT ON COLUMN public.products.is_new_expires_at IS
'CÓPIA de compatibilidade de novelty_expires_at. Mantida em sync por trigger. Prefira usar novelty_expires_at para novos desenvolvimentos.';
;
