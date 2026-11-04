CREATE OR REPLACE FUNCTION public.fn_dar_forbid_reopen()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- fix_version=20260626_m6 | ANTI-REGRESSAO: manter o bloqueio terminal->pending.
  IF NEW.status = 'pending' AND OLD.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'discount_approval_requests nao pode retornar para pending a partir de % (re-open proibido; crie nova solicitacao)', OLD.status
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$function$
