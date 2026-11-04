CREATE OR REPLACE FUNCTION public.admin_revoke_user_sessions(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'dev'::public.app_role) THEN
    RAISE EXCEPTION 'insufficient_privilege: requer role dev'
      USING ERRCODE = '42501';
  END IF;
  IF coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' THEN
    RAISE EXCEPTION 'insufficient_privilege: requer sessão AAL2'
      USING ERRCODE = '42501';
  END IF;

  -- Paridade com o 400 da edge manage-users (revoke_sessions): a RPC
  -- revoga TODAS as sessões do alvo, incluindo a do próprio chamador —
  -- quem quer derrubar só as outras sessões deve usar o logout normal.
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'self_revocation_denied: use o logout em outros dispositivos'
      USING ERRCODE = '42501';
  END IF;

  UPDATE auth.refresh_tokens rt
     SET revoked = true
    FROM auth.sessions s
   WHERE rt.session_id = s.id
     AND s.user_id = _user_id;

  UPDATE auth.sessions
     SET refresh_token_hmac_key = NULL
   WHERE user_id = _user_id;

  PERFORM public.revoke_all_user_tokens(_user_id);

  -- Trilha no DB: a edge audita a camada de aplicação (source distinto),
  -- aqui fica a evidência da revogação efetiva, cobrindo também chamada
  -- direta via PostgREST. Falha não aborta a revogação.
  BEGIN
    INSERT INTO public.admin_audit_log
      (user_id, action, resource_type, resource_id, status, source,
       details, ip_address)
    VALUES (
      auth.uid(),
      'session.revoke_all',
      'auth',
      _user_id::text,
      'success',
      'db:admin_revoke_user_sessions',
      jsonb_build_object('target_user_id', _user_id, 'scope', 'global'),
      btrim(substring(
        NULLIF(current_setting('request.headers', true), '')::jsonb
          ->> 'x-forwarded-for'
        from '([^,]+)$')));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'admin_revoke_user_sessions: audit insert failed: %', SQLERRM;
  END;
END;
$function$
