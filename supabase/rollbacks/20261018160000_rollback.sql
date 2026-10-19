-- Rollback de 20261018160000: reverte admin_revoke_user_sessions para a
-- versão de 20261015150000 (sem guard anti-self, sem INSERT em admin_audit_log).
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

  UPDATE auth.refresh_tokens rt
     SET revoked = true
    FROM auth.sessions s
   WHERE rt.session_id = s.id
     AND s.user_id = _user_id;

  UPDATE auth.sessions
     SET refresh_token_hmac_key = NULL
   WHERE user_id = _user_id;

  PERFORM public.revoke_all_user_tokens(_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_revoke_user_sessions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_user_sessions(uuid) TO authenticated;

COMMENT ON FUNCTION public.admin_revoke_user_sessions(uuid) IS
  'Revoga refresh tokens + marca revogação (dev + aal2). Painel: /admin/sessoes.';
