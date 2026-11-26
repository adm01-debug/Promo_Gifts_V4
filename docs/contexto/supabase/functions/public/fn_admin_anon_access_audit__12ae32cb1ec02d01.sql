CREATE OR REPLACE FUNCTION public.fn_admin_anon_access_audit()
 RETURNS TABLE(categoria text, objeto text, anon_grant boolean, auth_grant boolean, severidade text, descricao text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticacao obrigatoria.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_admin_or_above(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;

  -- O diagnostico de base e VOLATILE (le catalogos e privilegios do momento),
  -- por isso o wrapper nao se declara STABLE.
  RETURN QUERY
  SELECT a.categoria, a.objeto, a.anon_grant, a.auth_grant, a.severidade, a.descricao
  FROM public.fn_anon_access_audit() AS a;
END;
$function$
