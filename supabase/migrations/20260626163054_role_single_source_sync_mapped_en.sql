-- Fonte única = user_roles (enum PT). profiles.role = espelho derivado no vocabulário EN do CHECK.

-- Mapeamento enum(PT) -> {admin,manager,sales} (dentro de profiles_valid_role)
CREATE OR REPLACE FUNCTION public.fn_map_role_enum_to_profile(p_enum text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $map$
  SELECT CASE p_enum
    WHEN 'dev'         THEN 'admin'
    WHEN 'admin'       THEN 'admin'
    WHEN 'coordenador' THEN 'manager'
    WHEN 'supervisor'  THEN 'manager'
    WHEN 'manager'     THEN 'manager'
    WHEN 'agente'      THEN 'sales'
    WHEN 'vendedor'    THEN 'sales'
    ELSE 'sales' END
$map$;

-- Sync: pega role de maior privilégio e mapeia p/ EN
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

  IF v_enum IS NULL THEN RETURN; END IF;  -- sem roles: preserva valor atual
  v_mapped := public.fn_map_role_enum_to_profile(v_enum);

  UPDATE public.profiles
     SET role = v_mapped, updated_at = now()
   WHERE user_id = p_user_id AND role IS DISTINCT FROM v_mapped;
END; $func$;

-- Trigger
CREATE OR REPLACE FUNCTION public.trg_user_roles_sync_profile_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $trg$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.fn_sync_profile_role_from_user_roles(OLD.user_id);
    RETURN OLD;
  END IF;
  PERFORM public.fn_sync_profile_role_from_user_roles(NEW.user_id);
  IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    PERFORM public.fn_sync_profile_role_from_user_roles(OLD.user_id);
  END IF;
  RETURN NEW;
END; $trg$;

DROP TRIGGER IF EXISTS user_roles_sync_profile_role ON public.user_roles;
CREATE TRIGGER user_roles_sync_profile_role
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.trg_user_roles_sync_profile_role();

-- Backfill (corrige o caso real: dev -> admin; demais já coerentes)
UPDATE public.profiles p
SET role = public.fn_map_role_enum_to_profile(sub.r), updated_at = now()
FROM (
  SELECT ur.user_id,
    (ARRAY_AGG(ur.role::text ORDER BY CASE ur.role::text
      WHEN 'dev' THEN 1 WHEN 'admin' THEN 2 WHEN 'coordenador' THEN 3
      WHEN 'supervisor' THEN 4 WHEN 'manager' THEN 5 WHEN 'agente' THEN 6
      WHEN 'vendedor' THEN 7 ELSE 99 END))[1] AS r
  FROM public.user_roles ur GROUP BY ur.user_id
) sub
WHERE p.user_id = sub.user_id
  AND p.role IS DISTINCT FROM public.fn_map_role_enum_to_profile(sub.r);

COMMENT ON COLUMN public.profiles.role IS
 'DERIVADO/read-only (vocabulario EN: admin/manager/sales). Fonte de verdade = public.user_roles (enum PT). Sincronizado pelo trigger user_roles_sync_profile_role via fn_map_role_enum_to_profile. Nao escrever manualmente.';;
