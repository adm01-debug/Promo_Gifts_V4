CREATE OR REPLACE FUNCTION public.get_supplier_code(p_supplier_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
    SELECT code FROM suppliers WHERE id = p_supplier_id;
$function$
