CREATE OR REPLACE FUNCTION public.vault_list_secret_names()
 RETURNS TABLE(name text, description text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
BEGIN
  -- Gate: dev e supervisor podem listar nomes (auditoria de inventário)
  IF NOT public.is_supervisor_or_above(auth.uid()) THEN
    RAISE EXCEPTION 'unauthorized: requires supervisor role or above'
      USING ERRCODE = '42501';
  END IF;
  
  RETURN QUERY
  SELECT s.name, s.description, s.created_at, s.updated_at 
  FROM vault.secrets s 
  ORDER BY s.name;
END $function$
