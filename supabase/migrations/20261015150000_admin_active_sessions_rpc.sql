-- Painel de sessões ativas (auditoria 22-dim, Autenticação 8/10):
-- "sessões simultâneas sem painel de gestão". Expõe as sessões vivas de
-- auth.users (uma linha por sessão) para roles admin/supervisor/dev.
-- A revogação fica no edge manage-users (action revoke_sessions), que usa
-- auth.admin.signOut(user_id,'global') — revogar uma sessão específica não é
-- suportado pelo GoTrue, então a UX revoga TODAS as sessões do usuário alvo.
--
-- Segurança: SECURITY DEFINER com guard explícita de role (qualquer chamador
-- authenticated sem role privilegiada recebe insufficient_privilege) +
-- search_path fixo + EXECUTE revogado de PUBLIC/anon.

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
  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'supervisor'::public.app_role)
    OR public.has_role(auth.uid(), 'dev'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'insufficient_privilege: requer role admin, supervisor ou dev'
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
    EXISTS (
      SELECT 1
      FROM auth.refresh_tokens rt
      WHERE rt.session_id = s.id
        AND rt.revoked IS NOT TRUE
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
  'Lista sessões ativas de auth.users (admin/supervisor/dev). Painel: /admin/sessoes.';
