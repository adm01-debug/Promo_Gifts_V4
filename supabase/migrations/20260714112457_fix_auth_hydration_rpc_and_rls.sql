
-- ============================================================
-- MIGRATION: fix_auth_hydration_rpc_and_rls
-- Resolve hydration_timeout:profile+roles:5000ms
-- Combina 2 round-trips em 1 RPC + corrige RLS profiles_select
-- ============================================================

-- 1. RPC combinada: perfil + roles em um único round-trip
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
  -- Guard: só o próprio usuário (ou dev) pode buscar
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

  -- Agrega roles em array JSON
  SELECT jsonb_agg(ur.role ORDER BY ur.role) INTO v_roles
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id;

  RETURN jsonb_build_object(
    'profile', v_profile,
    'roles',   COALESCE(v_roles, '[]'::jsonb)
  );
END;
$$;

-- Permissões: apenas authenticated pode invocar
REVOKE ALL ON FUNCTION public.get_profile_and_roles(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_profile_and_roles(uuid) TO authenticated;

-- 2. Corrige RLS profiles_select: usar user_id em vez de id (gen_random_uuid())
--    Antes: auth.uid() = id    (semanticamente errado — id é gen_random_uuid())
--    Depois: auth.uid() = user_id  (correto — user_id é a FK para auth.users)
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    (( SELECT auth.uid() AS uid) = user_id)
    OR is_admin_or_above(( SELECT auth.uid() AS uid))
  );

-- 3. Corrige também profiles_update: mesma inconsistência
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update"
  ON public.profiles
  FOR UPDATE
  TO public
  USING      ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
;
