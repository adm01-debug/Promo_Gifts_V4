
-- ============================================================
-- MIGRATION v2: fix_auth_hydration_insert_policy_null_guard
-- Bugs encontrados na auditoria exaustiva pós-deploy
-- ============================================================

-- BUG 3: profiles_insert usava `id` em vez de `user_id` como WITH CHECK
-- Inconsistência: SELECT e UPDATE já usam user_id (corrigidos na v1)
-- INSERT ainda checa `auth.uid() = id` — se uma linha for criada com
-- id=auth.uid() mas user_id≠auth.uid(), fica invisível via SELECT/UPDATE
-- Fix: add WITH CHECK em user_id também (mantendo id para compatibilidade)
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert"
  ON public.profiles
  FOR INSERT
  TO public
  WITH CHECK (
    (( SELECT auth.uid() AS uid) = user_id)
    AND (( SELECT auth.uid() AS uid) = id)
  );

-- BUG 4: RPC sem guard contra _user_id = NULL
-- NULL IS DISTINCT FROM NULL = FALSE → guard não dispara → retorna vazio
-- Correto adicionar checagem explícita
CREATE OR REPLACE FUNCTION public.get_profile_and_roles(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_profile jsonb;
  v_roles   jsonb;
BEGIN
  -- Guard NULL: _user_id nulo não tem significado válido
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'get_profile_and_roles: _user_id cannot be null'
      USING ERRCODE = '22004';  -- null_value_not_allowed
  END IF;

  -- Guard cross-user: só o próprio usuário (ou dev) pode buscar
  IF _user_id IS DISTINCT FROM auth.uid()
     AND NOT public.has_role(auth.uid(), 'dev'::app_role)
  THEN
    RAISE EXCEPTION 'forbidden: cannot query profile of another user'
      USING ERRCODE = '42501';
  END IF;

  -- Busca profile pela coluna correta (user_id, não id)
  SELECT to_jsonb(p) INTO v_profile
  FROM public.profiles p
  WHERE p.user_id = _user_id
  LIMIT 1;

  -- Agrega roles em array JSON (ordenado para determinismo)
  SELECT jsonb_agg(ur.role ORDER BY ur.role) INTO v_roles
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id;

  RETURN jsonb_build_object(
    'profile', v_profile,
    'roles',   COALESCE(v_roles, '[]'::jsonb)
  );
END;
$$;
;
