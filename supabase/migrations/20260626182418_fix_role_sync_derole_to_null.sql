-- GAP FIX revelado por teste: ao remover TODAS as roles, profiles.role vira NULL
-- (sem papel) em vez de manter o ultimo valor (stale/phantom). role e nullable e o
-- CHECK aceita NULL. Sem impacto em dados atuais (0 usuarios sem role).
CREATE OR REPLACE FUNCTION public.fn_sync_profile_role_from_user_roles(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $func$
DECLARE v_enum text; v_mapped text;
BEGIN
  SELECT ur.role::text INTO v_enum
  FROM public.user_roles ur
  WHERE ur.user_id = p_user_id
  ORDER BY CASE ur.role::text
    WHEN 'dev' THEN 1 WHEN 'admin' THEN 2 WHEN 'coordenador' THEN 3
    WHEN 'supervisor' THEN 4 WHEN 'manager' THEN 5 WHEN 'agente' THEN 6
    WHEN 'vendedor' THEN 7 ELSE 99 END
  LIMIT 1;

  v_mapped := CASE WHEN v_enum IS NULL THEN NULL
                   ELSE public.fn_map_role_enum_to_profile(v_enum) END;

  UPDATE public.profiles
     SET role = v_mapped, updated_at = now()
   WHERE user_id = p_user_id AND role IS DISTINCT FROM v_mapped;
END; $func$;;
