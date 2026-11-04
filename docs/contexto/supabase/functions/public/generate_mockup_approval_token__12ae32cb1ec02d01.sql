CREATE OR REPLACE FUNCTION public.generate_mockup_approval_token()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_token text;
  v_exists boolean;
BEGIN
  LOOP
    v_token := encode(gen_random_bytes(24), 'base64');
    v_token := replace(replace(replace(v_token, '/', ''), '+', ''), '=', '');
    v_token := substring(v_token, 1, 32);
    SELECT EXISTS(SELECT 1 FROM public.mockup_approval_links WHERE public_token = v_token) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_token;
END $function$
