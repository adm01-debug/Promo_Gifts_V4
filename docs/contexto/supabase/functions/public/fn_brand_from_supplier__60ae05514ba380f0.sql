CREATE OR REPLACE FUNCTION public.fn_brand_from_supplier(p_supplier_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE PARALLEL SAFE STRICT
 SET search_path TO 'public'
AS $function$
    SELECT name FROM public.suppliers WHERE id = p_supplier_id LIMIT 1;
$function$
