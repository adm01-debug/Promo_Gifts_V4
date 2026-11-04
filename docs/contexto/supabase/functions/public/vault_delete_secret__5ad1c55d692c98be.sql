CREATE OR REPLACE FUNCTION public.vault_delete_secret(p_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
DECLARE
  v_deleted integer;
BEGIN
  IF NOT public.is_admin_strict(auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized: only dev role can delete from vault'
      USING ERRCODE = '42501';
  END IF;
  
  DELETE FROM vault.secrets WHERE name = p_name;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END $function$
