CREATE OR REPLACE FUNCTION public.fn_dar_check_valid_until_future()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- fix_version=20260626_m5 | ANTI-REGRESSAO: manter como trigger de TRANSICAO, jamais CHECK persistente.
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    IF NEW.valid_until IS NOT NULL AND NEW.valid_until::date < CURRENT_DATE THEN
      RAISE EXCEPTION 'valid_until nao pode estar no passado ao aprovar (recebido: %, hoje: %)', NEW.valid_until, CURRENT_DATE
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
