CREATE OR REPLACE FUNCTION public.fn_dar_enforce_initial_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'discount_approval_requests deve nascer com status pending (recebido: %)', NEW.status
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $function$
