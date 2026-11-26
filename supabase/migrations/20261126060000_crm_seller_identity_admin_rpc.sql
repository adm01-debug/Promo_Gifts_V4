-- Tela /admin/vinculos-vendedor-crm: gestao do mapeamento 1:1 auth.users -> vendedor do CRM.
-- A tabela public.crm_seller_identity_links permanece deny-all (sem policies, sem grant a
-- anon/authenticated); todo acesso passa por estas RPCs SECURITY DEFINER com guard de role.
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_admin_list_crm_seller_links(
  _search text DEFAULT NULL,
  _limit integer DEFAULT 200
)
RETURNS TABLE (
  auth_user_id uuid,
  crm_seller_id bigint,
  link_source text,
  created_at timestamp with time zone,
  full_name text,
  email text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

COMMENT ON FUNCTION public.fn_admin_list_crm_seller_links(text, integer) IS
  'Lista os vinculos auth.users -> vendedor do CRM externo para a tela /admin/vinculos-vendedor-crm. Guard is_admin_or_above, le a tabela deny-all crm_seller_identity_links e enriquece com profiles.';

CREATE OR REPLACE FUNCTION public.fn_admin_link_crm_seller(
  _crm_seller_id bigint,
  _auth_user_id uuid DEFAULT NULL,
  _email text DEFAULT NULL
)
RETURNS TABLE (
  action text,
  previous_crm_seller_id bigint,
  auth_user_id uuid,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

COMMENT ON FUNCTION public.fn_admin_link_crm_seller(bigint, uuid, text) IS
  'Cria ou corrige o vinculo auth.users -> vendedor do CRM externo com link_source=manual (aceita e-mail ou auth_user_id), audita em admin_audit_log e rejeita id invalido, usuario inexistente ou vendedor ja vinculado (23505).';

CREATE OR REPLACE FUNCTION public.fn_admin_unlink_crm_seller(_auth_user_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

COMMENT ON FUNCTION public.fn_admin_unlink_crm_seller(uuid) IS
  'Desfaz o vinculo auth.users -> vendedor do CRM externo (o bridge volta a resolver por e-mail no proximo acesso), audita em admin_audit_log e e idempotente.';

REVOKE ALL ON FUNCTION public.fn_admin_list_crm_seller_links(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_admin_list_crm_seller_links(text, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.fn_admin_link_crm_seller(bigint, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_admin_link_crm_seller(bigint, uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.fn_admin_unlink_crm_seller(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_admin_unlink_crm_seller(uuid) TO authenticated, service_role;

COMMIT;