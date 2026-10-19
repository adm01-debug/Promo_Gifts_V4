-- Revisão DBA 2026-10-18 (validação exaustiva pós-implementação):
--   admin_revoke_user_sessions só tinha trilha na edge manage-users. Uma
--   chamada DIRETA à RPC via PostgREST (GRANT EXECUTE a authenticated +
--   guard dev/aal2 interno) revogava sessões SEM linha em admin_audit_log
--   e ignorava o guard anti-self da edge. Correção: a definição abaixo
--   repete o corpo de 20261015150000 acrescentando (a) recusa de
--   auto-revogação (paridade com o 400 da edge) e (b) INSERT em
--   admin_audit_log dentro da mesma transação — falha de auditoria não
--   bloqueia a revogação (mesmo padrão de fn_audit_row_change), mas a
--   revogação direta nunca mais passa sem tentativa de trilha.
--
-- ORDEM DE APLICAÇÃO: aplicar APÓS 20261015150000_admin_active_sessions_rpc.
-- Se for aplicada antes, ela já cria a função com a definição correta; o
-- problema é o inverso — reaplicar 20261015150000 depois desta reverte
-- guard+auditoria. Versões ordenadas resolvem (db-apply-migration aplica
-- em ordem crescente).
--
-- Rollback: CREATE OR REPLACE public.admin_revoke_user_sessions(uuid) com o
--   corpo de supabase/migrations/20261015150000_admin_active_sessions_rpc.sql
--   (definição sem guard anti-self e sem insert de auditoria).
CREATE OR REPLACE FUNCTION public.admin_revoke_user_sessions(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.admin_revoke_user_sessions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_user_sessions(uuid) TO authenticated;

COMMENT ON FUNCTION public.admin_revoke_user_sessions(uuid) IS
  'Revoga refresh tokens + marca revogação (dev + aal2, sem self, com auditoria no DB). Painel: /admin/sessoes.';
