-- MELHORIA 3/4: remove codigo/enum morto do subsistema de auditoria de aprovacao de desconto.
-- (1) fn_audit_discount_approval tratava um ramo de status 'cancelled' INALCANCAVEL: o CHECK
--     discount_approval_requests_status_check so permite pending/approved/rejected/expired, entao
--     NEW.status nunca eh 'cancelled'. Ramo removido.
-- (2) discount_approval_audit_event_check permitia 'superseded'/'cancelled' SEM produtor (nenhuma
--     funcao escreve esses eventos). CHECK apertado para o conjunto produzivel {requested,approved,rejected,expired}.
-- Tabela de auditoria tem 0 linhas; unico escritor eh este trigger DEFINER.
-- Validado via dry-run: 100 ciclos de regressao + CHECK rejeitando superseded/cancelled (23514).
-- Se cancelamento/supersessao virar fluxo de produto no futuro, reintroduzir status no CHECK de requests + evento aqui.
-- anti-regressao (Lovable): manter a lista IN (...) sem 'cancelled'. fix_version=20260625_m3

CREATE OR REPLACE FUNCTION public.fn_audit_discount_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_event text; v_actor_role text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event := 'requested'; v_actor_role := 'seller';
    INSERT INTO public.discount_approval_audit(request_id, quote_id, actor_id, actor_role, event, requested_discount_percent, max_allowed_percent, seller_notes)
    VALUES (NEW.id, NEW.quote_id, NEW.seller_id, v_actor_role, v_event, NEW.requested_discount_percent, NEW.max_allowed_percent, NEW.seller_notes);
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('approved','rejected','expired') THEN  -- somente status terminais aceitos pelo CHECK de discount_approval_requests
      v_event := NEW.status;
      v_actor_role := CASE
        WHEN NEW.admin_id IS NOT NULL AND public.has_role(NEW.admin_id, 'supervisor'::app_role) THEN 'supervisor'
        WHEN NEW.admin_id IS NOT NULL THEN 'admin' ELSE 'system' END;
      INSERT INTO public.discount_approval_audit(request_id, quote_id, actor_id, actor_role, event, requested_discount_percent, max_allowed_percent, admin_notes, seller_notes)
      VALUES (NEW.id, NEW.quote_id, NEW.admin_id, v_actor_role, v_event, NEW.requested_discount_percent, NEW.max_allowed_percent, NEW.admin_notes, NEW.seller_notes);
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

ALTER TABLE public.discount_approval_audit DROP CONSTRAINT discount_approval_audit_event_check;
ALTER TABLE public.discount_approval_audit ADD CONSTRAINT discount_approval_audit_event_check
  CHECK (event = ANY (ARRAY['requested'::text,'approved'::text,'rejected'::text,'expired'::text]));
