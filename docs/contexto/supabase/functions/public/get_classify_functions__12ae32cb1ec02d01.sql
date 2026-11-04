CREATE OR REPLACE FUNCTION public.get_classify_functions()
 RETURNS TABLE(function_name character varying, description text, is_field character varying, priority integer, is_active boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
    SELECT function_name, description, is_field, priority, is_active
    FROM classify_functions_registry
    ORDER BY priority ASC;
$function$
