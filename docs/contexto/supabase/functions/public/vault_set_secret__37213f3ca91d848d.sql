CREATE OR REPLACE FUNCTION public.vault_set_secret(p_name text, p_value text, p_description text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'extensions'
AS $function$
DECLARE
  v_secret_id uuid;
BEGIN
  IF NOT public.is_admin_strict(auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized: only dev role can write to vault'
      USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_secret_id FROM vault.secrets WHERE name = p_name LIMIT 1;
  
  IF v_secret_id IS NULL THEN
    -- API oficial: create_secret(new_secret, new_name, new_description)
    SELECT vault.create_secret(p_value, p_name, p_description) INTO v_secret_id;
  ELSE
    PERFORM vault.update_secret(v_secret_id, p_value, p_name, COALESCE(p_description, ''));
  END IF;
  
  RETURN v_secret_id;
END $function$
