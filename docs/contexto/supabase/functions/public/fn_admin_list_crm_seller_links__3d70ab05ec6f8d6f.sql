CREATE OR REPLACE FUNCTION public.fn_admin_list_crm_seller_links(_search text DEFAULT NULL::text, _limit integer DEFAULT 200)
 RETURNS TABLE(auth_user_id uuid, crm_seller_id bigint, link_source text, created_at timestamp with time zone, full_name text, email text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(_limit, 200), 1), 500);
  v_search text := NULLIF(btrim(COALESCE(_search, '')), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticacao obrigatoria.' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_admin_or_above(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT l.auth_user_id,
         l.crm_seller_id,
         l.link_source,
         l.created_at,
         p.full_name,
         p.email
    FROM public.crm_seller_identity_links l
    LEFT JOIN public.profiles p ON p.user_id = l.auth_user_id
   WHERE v_search IS NULL
      OR p.email ILIKE '%' || v_search || '%'
      OR p.full_name ILIKE '%' || v_search || '%'
      OR l.crm_seller_id::text = v_search
   ORDER BY l.created_at DESC
   LIMIT v_limit;
END;
$function$
