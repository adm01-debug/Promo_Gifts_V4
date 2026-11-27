CREATE OR REPLACE FUNCTION public.fn_admin_link_crm_seller(_crm_seller_id bigint, _auth_user_id uuid DEFAULT NULL::uuid, _email text DEFAULT NULL::text)
 RETURNS TABLE(action text, previous_crm_seller_id bigint, auth_user_id uuid, email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_previous bigint;
  v_user_id uuid;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticacao obrigatoria.' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_admin_or_above(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;
  IF _crm_seller_id IS NULL OR _crm_seller_id <= 0 THEN
    RAISE EXCEPTION 'O id do vendedor no CRM deve ser um inteiro positivo.' USING ERRCODE = '22023';
  END IF;

  IF _auth_user_id IS NULL THEN
    IF NULLIF(btrim(COALESCE(_email, '')), '') IS NULL THEN
      RAISE EXCEPTION 'Informe o e-mail ou o id do usuario a vincular.' USING ERRCODE = '22023';
    END IF;
    SELECT u.id, u.email INTO v_user_id, v_email
      FROM auth.users u
     WHERE lower(u.email) = lower(btrim(_email));
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Nenhum usuario cadastrado com o e-mail %.', btrim(_email) USING ERRCODE = '22023';
    END IF;
  ELSE
    SELECT u.id, u.email INTO v_user_id, v_email FROM auth.users u WHERE u.id = _auth_user_id;
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Usuario % nao existe em auth.users.', _auth_user_id USING ERRCODE = '23503';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.crm_seller_identity_links l
     WHERE l.crm_seller_id = _crm_seller_id AND l.auth_user_id <> v_user_id
  ) THEN
    RAISE EXCEPTION 'O vendedor % ja esta vinculado a outro usuario. Desfaca o vinculo anterior primeiro.', _crm_seller_id
      USING ERRCODE = '23505';
  END IF;

  SELECT l.crm_seller_id INTO v_previous
    FROM public.crm_seller_identity_links l
   WHERE l.auth_user_id = v_user_id;

  IF v_previous IS NULL THEN
    BEGIN
      INSERT INTO public.crm_seller_identity_links (auth_user_id, crm_seller_id, link_source)
      VALUES (v_user_id, _crm_seller_id, 'manual');
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'O vendedor % ou o usuario ja possui vinculo (corrida detectada). Recarregue a tela.', _crm_seller_id
        USING ERRCODE = '23505';
    END;
    PERFORM public.log_audit(
      'crm_seller_identity_link_created',
      'crm_seller_identity_links',
      v_user_id::text,
      jsonb_build_object('crm_seller_id', _crm_seller_id, 'link_source', 'manual', 'email', v_email)
    );
    RETURN QUERY SELECT 'created'::text, NULL::bigint, v_user_id, v_email;
  ELSIF v_previous = _crm_seller_id THEN
    RETURN QUERY SELECT 'unchanged'::text, v_previous, v_user_id, v_email;
  ELSE
    BEGIN
      UPDATE public.crm_seller_identity_links l
         SET crm_seller_id = _crm_seller_id,
             link_source = 'manual'
       WHERE l.auth_user_id = v_user_id;
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'O vendedor % ja esta vinculado a outro usuario (corrida detectada). Recarregue a tela.', _crm_seller_id
        USING ERRCODE = '23505';
    END;
    PERFORM public.log_audit(
      'crm_seller_identity_link_updated',
      'crm_seller_identity_links',
      v_user_id::text,
      jsonb_build_object('previous_crm_seller_id', v_previous, 'crm_seller_id', _crm_seller_id, 'link_source', 'manual', 'email', v_email)
    );
    RETURN QUERY SELECT 'updated'::text, v_previous, v_user_id, v_email;
  END IF;
END;
$function$
