CREATE OR REPLACE FUNCTION public._get_user_primary_role(_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE v_role text;
BEGIN
  SELECT ur.role::text INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
  ORDER BY CASE ur.role::text
    WHEN 'dev' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'supervisor' THEN 3
    WHEN 'manager' THEN 4
    WHEN 'agente' THEN 5
    ELSE 99
  END
  LIMIT 1;
  RETURN COALESCE(v_role, 'agente');
END;
$function$
