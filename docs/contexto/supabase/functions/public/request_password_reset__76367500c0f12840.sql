CREATE OR REPLACE FUNCTION public.request_password_reset(p_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
DECLARE
  v_email text := pg_catalog.lower(pg_catalog.btrim(COALESCE(p_email, '')));
BEGIN
  IF pg_catalog.length(v_email) < 5
     OR pg_catalog.length(v_email) > 254
     OR v_email !~ '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$' THEN
    RAISE EXCEPTION 'E-mail inválido.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.password_reset_requests (email, status)
  VALUES (v_email, 'pending')
  ON CONFLICT DO NOTHING;
END;
$function$
