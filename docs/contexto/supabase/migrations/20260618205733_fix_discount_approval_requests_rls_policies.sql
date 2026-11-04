-- ============================================================
-- FIX: discount_approval_requests — políticas RLS
-- 2026-06-18 (audit-10-10)
--
-- Problemas encontrados:
-- 1. 2 políticas INSERT duplicadas sem WITH CHECK →
--    seller pode inserir com seller_id de outro usuário.
-- 2. 2 políticas SELECT duplicadas (redundância).
--
-- Fix:
-- A. Remover políticas legadas (com nomes genéricos em inglês).
-- B. Manter as novas políticas dar_* que são mais completas.
-- C. Adicionar trigger BEFORE INSERT para forçar seller_id=auth.uid().
--    (Mais robusto que WITH CHECK porque não depende de quem chama.)
-- ============================================================

-- A: Remover políticas duplicadas/obsoletas
DROP POLICY IF EXISTS "Admins can manage all approval requests" ON public.discount_approval_requests;
DROP POLICY IF EXISTS "Sellers can insert own approval requests" ON public.discount_approval_requests;
DROP POLICY IF EXISTS "Sellers can read own approval requests" ON public.discount_approval_requests;

-- B: Manter dar_insert_scope, dar_select_scope, dar_update_scope, dar_delete_dev_only
-- (já estão corretas e mais abrangentes)

-- C: Trigger que força seller_id = auth.uid() em qualquer INSERT
-- Independente do que veio no payload, garante que seller_id é o caller.
CREATE OR REPLACE FUNCTION public.fn_dar_enforce_seller_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sempre forçar seller_id = usuário atual (BEFORE INSERT / UPDATE de seller_id)
  -- Previne que um vendedor crie solicitações em nome de outro.
  NEW.seller_id := auth.uid();
  RETURN NEW;
END;
$$;

-- Aplicar o trigger apenas em INSERT (UPDATE de seller_id não faz sentido)
DROP TRIGGER IF EXISTS trg_dar_enforce_seller_id ON public.discount_approval_requests;
CREATE TRIGGER trg_dar_enforce_seller_id
  BEFORE INSERT ON public.discount_approval_requests
  FOR EACH ROW EXECUTE FUNCTION fn_dar_enforce_seller_id();

COMMENT ON FUNCTION public.fn_dar_enforce_seller_id IS
  'Garante seller_id = auth.uid() em qualquer INSERT, independente do payload. '
  'Previne spoofing de seller_id via políticas RLS sem WITH CHECK. 2026-06-18.';
