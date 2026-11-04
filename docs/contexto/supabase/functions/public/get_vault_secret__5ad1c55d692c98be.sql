CREATE OR REPLACE FUNCTION public.get_vault_secret(p_name text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
DECLARE
  v_value TEXT;
BEGIN
  -- Apenas service_role pode chamar isso
  IF auth.role() NOT IN ('service_role') THEN
    RAISE EXCEPTION 'get_vault_secret: acesso negado (role: %)', auth.role();
  END IF;

  SELECT decrypted_secret INTO v_value
  FROM vault.decrypted_secrets
  WHERE name = p_name
  LIMIT 1;

  RETURN v_value;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL; -- fail-open: não quebra fluxo se vault indisponível
END;
$function$
