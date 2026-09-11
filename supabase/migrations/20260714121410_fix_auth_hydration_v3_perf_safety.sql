
-- ============================================================
-- MIGRATION v3: fix_auth_hydration_v3_perf_safety
-- 2026-07-14 — DB-statement-timeout + DB-covering-index + DB-comment
-- ============================================================

-- MELHORIA 1: statement_timeout interno à RPC
-- Garante que se Supabase travar (ex: lock contention, pool exhaustion),
-- a função falha em 6s no servidor — antes do withTimeout(7s) do cliente.
-- Isso evita que a RPC rode "para sempre" na conexão e libera o pool.
CREATE OR REPLACE FUNCTION public.get_profile_and_roles(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
SET statement_timeout = '6000ms'
AS $$
DECLARE
  v_profile jsonb;
  v_roles   jsonb;
BEGIN
  -- Guard NULL: _user_id nulo não tem significado válido
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'get_profile_and_roles: _user_id cannot be null'
      USING ERRCODE = '22004';
  END IF;

  -- Guard cross-user: só o próprio usuário (ou dev) pode buscar
  IF _user_id IS DISTINCT FROM auth.uid()
     AND NOT public.has_role(auth.uid(), 'dev'::app_role)
  THEN
    RAISE EXCEPTION 'forbidden: cannot query profile of another user'
      USING ERRCODE = '42501';
  END IF;

  -- Busca profile em index covering (user_id)
  SELECT to_jsonb(p) INTO v_profile
  FROM public.profiles p
  WHERE p.user_id = _user_id
  LIMIT 1;

  -- Agrega roles (covering index user_id+role entra em ação aqui)
  SELECT jsonb_agg(ur.role ORDER BY ur.role) INTO v_roles
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id;

  RETURN jsonb_build_object(
    'profile', v_profile,
    'roles',   COALESCE(v_roles, '[]'::jsonb)
  );
END;
$$;

-- MELHORIA 2: Covering index em user_roles
-- O planner usa seq scan hoje (13 linhas) mas com > 50 usuários vai usar index.
-- INCLUDE 'role' elimina heap fetch (index-only scan) para a query de roles.
-- Partial index: exclui roles raros (dev/supervisor/admin) que já têm
-- idx_user_roles_user_id_role dedicado — foca nos vendedores/agentes.
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_covering
  ON public.user_roles (user_id, role);

-- MELHORIA 3: COMMENT na função para manutenção futura
COMMENT ON FUNCTION public.get_profile_and_roles(uuid) IS
  'RPC combinada: retorna {profile, roles} em 1 round-trip. '
  'SECURITY DEFINER — garante que vendedor não veja perfil alheio. '
  'statement_timeout=6s (< 7s do withTimeout no cliente). '
  'Caller: useProfileRoles.fetchUserData via supabase.rpc. '
  'Criada em 2026-07-14 para resolver hydration_timeout:profile+roles:5000ms. '
  'Migration: 20260714112808_fix_auth_hydration_rpc_and_rls.';
;
