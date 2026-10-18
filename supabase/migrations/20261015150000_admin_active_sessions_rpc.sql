-- Painel de sessões ativas (auditoria 22-dim, Autenticação 8/10):
-- "sessões simultâneas sem painel de gestão". Expõe as sessões vivas de
-- auth.users (uma linha por sessão) para o papel dev — mesmo contrato da
-- rota /admin/sessoes (DevRoute + mfaAal2): a guarda exige role 'dev' E
-- claim JWT aal=aal2 (auth.jwt() já validado pelo PostgREST).
-- A revogação fica no edge manage-users (action revoke_sessions), que usa
-- a RPC revoke_all_user_tokens (user_token_revocations.revoked_at, lida por
-- isTokenRevoked/authorize): o GoTrue não revoga sessão por user_id —
-- auth.admin.signOut exige o JWT da sessão alvo.
-- Rollback: DROP FUNCTION public.admin_active_sessions();
--
-- Segurança: SECURITY DEFINER com guard explícita de role + aal2 (qualquer
-- chamador authenticated sem papel dev ou com aal<aal2 recebe
-- insufficient_privilege) + search_path fixo + EXECUTE revogado de
-- PUBLIC/anon.

CREATE OR REPLACE FUNCTION public.admin_active_sessions()
RETURNS TABLE (
  user_id uuid,
  email text,
  session_id uuid,
  session_created_at timestamptz,
  session_updated_at timestamptz,
  refreshed_at timestamptz,
  not_after timestamptz,
  ip text,
  user_agent text,
  live_refresh_token boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'dev'::public.app_role) THEN
    RAISE EXCEPTION 'insufficient_privilege: requer role dev'
      USING ERRCODE = '42501';
  END IF;

  -- Espelha mfaAal2 da rota: claim aal do JWT já verificado pelo PostgREST.
  IF coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' THEN
    RAISE EXCEPTION 'insufficient_privilege: requer sessão AAL2'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    s.id,
    s.created_at,
    s.updated_at,
    s.refreshed_at::timestamptz,
    s.not_after,
    s.ip::text,
    s.user_agent,
    (
      EXISTS (
        SELECT 1
        FROM auth.refresh_tokens rt
        WHERE rt.session_id = s.id
          AND rt.revoked IS NOT TRUE
      )
      -- Refresh tokens v2 vivem na própria sessão (hmac_key + counter),
      -- sem linha em auth.refresh_tokens.
      OR s.refresh_token_hmac_key IS NOT NULL
    ) AS live_refresh_token
  FROM auth.users u
  JOIN auth.sessions s ON s.user_id = u.id
  WHERE s.not_after IS NULL OR s.not_after > now()
  ORDER BY s.updated_at DESC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_active_sessions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_active_sessions() TO authenticated;

COMMENT ON FUNCTION public.admin_active_sessions() IS
  'Lista sessões ativas de auth.users (dev + aal2). Painel: /admin/sessoes.';
