CREATE OR REPLACE FUNCTION public.is_admin_or_above(_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF _user_id IS DISTINCT FROM auth.uid()
     AND NOT public.has_role(auth.uid(), 'dev'::app_role) THEN
    RAISE EXCEPTION 'forbidden: cannot query role of another user'
      USING ERRCODE = '42501';
  END IF;
  RETURN public.is_supervisor_or_above(_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_coord_or_above(_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF _user_id IS DISTINCT FROM auth.uid()
     AND NOT public.has_role(auth.uid(), 'dev'::app_role) THEN
    RAISE EXCEPTION 'forbidden: cannot query role of another user'
      USING ERRCODE = '42501';
  END IF;
  RETURN public.is_supervisor_or_above(_user_id);
END;
$$;

COMMENT ON FUNCTION public.can_access_quote(uuid) IS 'RLS-002 audit (2026-05-22): SECURITY DEFINER intencionalmente exposto a authenticated. Avalia auth.uid() internamente — não vaza info de quotes do usuário; só retorna boolean sobre quote ao qual o caller já tem acesso via RLS.';
COMMENT ON FUNCTION public.org_has_any_members(uuid) IS 'RLS-002 audit (2026-05-22): SECURITY DEFINER intencionalmente exposto a authenticated. Usado no fluxo de criação de organização (boot da primeira org). Retorna apenas boolean — leak material mínimo. Sem ação adicional necessária.';
COMMENT ON FUNCTION public.check_login_rate_limit(text, text) IS 'RLS-002 audit (2026-05-22): SECURITY DEFINER intencionalmente exposto a anon. Necessário para verificar rate limit ANTES de login. Sem ação adicional necessária.';
COMMENT ON FUNCTION public.is_admin_or_above(uuid) IS 'RLS-002 hardening (2026-05-22): exige _user_id = auth.uid() para usuários comuns. Dev pode checar qualquer user. Antes: info disclosure cross-user via PostgREST RPC.';
COMMENT ON FUNCTION public.is_coord_or_above(uuid) IS 'RLS-002 hardening (2026-05-22): exige _user_id = auth.uid() para usuários comuns. Dev pode checar qualquer user. Antes: info disclosure cross-user via PostgREST RPC.';
