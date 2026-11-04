CREATE OR REPLACE FUNCTION public.enforce_password_reset_rate_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  recent_count integer;
  window_minutes constant integer := 60;
  max_requests   constant integer := 3;
BEGIN
  -- Conta solicitações recentes do mesmo e-mail (case-insensitive).
  -- SECURITY DEFINER é necessário porque anon não possui SELECT na tabela.
  SELECT count(*) INTO recent_count
  FROM public.password_reset_requests
  WHERE lower(email) = lower(NEW.email)
    AND requested_at > now() - make_interval(mins => window_minutes);

  IF recent_count >= max_requests THEN
    RAISE EXCEPTION 'Muitas solicitações de redefinição de senha. Tente novamente mais tarde.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$
