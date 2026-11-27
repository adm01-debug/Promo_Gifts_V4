CREATE OR REPLACE FUNCTION public.fn_admin_unlink_crm_seller(_auth_user_id uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_previous bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticacao obrigatoria.' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_admin_or_above(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;
  IF _auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Informe o usuario (auth_user_id) a desvincular.' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.crm_seller_identity_links l
   WHERE l.auth_user_id = _auth_user_id
  RETURNING l.crm_seller_id INTO v_previous;

  IF v_previous IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM public.log_audit(
    'crm_seller_identity_link_removed',
    'crm_seller_identity_links',
    _auth_user_id::text,
    jsonb_build_object('crm_seller_id', v_previous)
  );

  RETURN v_previous;
END;
$function$
