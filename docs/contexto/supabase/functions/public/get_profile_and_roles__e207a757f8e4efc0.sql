CREATE OR REPLACE FUNCTION public.get_profile_and_roles(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '6000ms'
AS $function$
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
$function$
