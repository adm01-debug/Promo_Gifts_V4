CREATE OR REPLACE FUNCTION public.get_edge_functions_base_url()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
DECLARE
  _cfg text;
  _vault text;
BEGIN
  _cfg := NULLIF(current_setting('app.edge_functions_base_url', true), '');

  IF _cfg IS NOT NULL THEN
    IF _cfg ~ '^https://[a-z0-9-]+\.supabase\.co$' THEN
      RETURN _cfg;
    END IF;

    RAISE EXCEPTION 'app.edge_functions_base_url invalido: %', _cfg
      USING ERRCODE = '22023';
  END IF;

  SELECT decrypted_secret INTO _vault
  FROM vault.decrypted_secrets
  WHERE name = 'EDGE_FUNCTIONS_BASE_URL'
  LIMIT 1;

  IF _vault IS NOT NULL THEN
    IF _vault ~ '^https://[a-z0-9-]+\.supabase\.co$' THEN
      RETURN _vault;
    END IF;

    RAISE EXCEPTION 'Secret EDGE_FUNCTIONS_BASE_URL invalido no vault: %', _vault
      USING ERRCODE = '22023';
  END IF;

  RAISE EXCEPTION 'Base URL das Edge Functions nao configurada. Defina app.edge_functions_base_url ou secret EDGE_FUNCTIONS_BASE_URL.'
    USING ERRCODE = 'no_data_found';
END;
$function$
