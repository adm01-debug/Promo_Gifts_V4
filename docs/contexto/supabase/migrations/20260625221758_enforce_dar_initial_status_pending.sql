-- MELHORIA 4/4: enforca que toda solicitacao de aprovacao de desconto NASCE com status 'pending'.
-- Fecha o edge case: um INSERT direto com status nao-pending (fora do fluxo do app) registrava
-- auditoria 'requested' inconsistente e NAO notificava o admin (notify so dispara p/ pending).
-- O app (useDiscountApproval.ts L130) nunca seta status -> depende do DEFAULT 'pending', entao este
-- trigger eh transparente p/ a aplicacao. approved/rejected/expired continuam sendo UPDATEs (trigger eh BEFORE INSERT).
-- Validado via dry-run: insert-app=>pending, inserts diretos terminais=>23514, 50 ciclos de fluxo completo.
-- anti-regressao (Lovable): manter este trigger BEFORE INSERT. fix_version=20260625_m4

CREATE OR REPLACE FUNCTION public.fn_dar_enforce_initial_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'discount_approval_requests deve nascer com status pending (recebido: %)', NEW.status
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS trg_dar_enforce_initial_status ON public.discount_approval_requests;
CREATE TRIGGER trg_dar_enforce_initial_status
  BEFORE INSERT ON public.discount_approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.fn_dar_enforce_initial_status();
