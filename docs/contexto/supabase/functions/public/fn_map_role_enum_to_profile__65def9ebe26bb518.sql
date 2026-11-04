CREATE OR REPLACE FUNCTION public.fn_map_role_enum_to_profile(p_enum text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  SELECT CASE p_enum
    WHEN 'dev'         THEN 'admin'
    WHEN 'admin'       THEN 'admin'
    WHEN 'coordenador' THEN 'manager'
    WHEN 'supervisor'  THEN 'manager'
    WHEN 'manager'     THEN 'manager'
    WHEN 'agente'      THEN 'sales'
    WHEN 'vendedor'    THEN 'sales'
    ELSE 'sales' END
$function$
