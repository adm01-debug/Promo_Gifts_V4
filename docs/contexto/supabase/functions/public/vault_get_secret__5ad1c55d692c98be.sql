CREATE OR REPLACE FUNCTION public.vault_get_secret(p_name text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
DECLARE
  v_value text;
BEGIN
  -- Gate: só dev pode ler em vault (edge functions usam service_role, bypassam isso)
  IF NOT public.is_admin_strict(auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized: only dev role can read vault directly. Edge functions bypass via service_role.'
      USING ERRCODE = '42501';
  END IF;
  
  SELECT decrypted_secret INTO v_value 
  FROM vault.decrypted_secrets 
  WHERE name = p_name 
  LIMIT 1;
  
  RETURN v_value;  -- NULL se não existe
END $function$
