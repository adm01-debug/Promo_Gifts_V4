CREATE OR REPLACE FUNCTION public.fn_resolve_color_for_variant(p_supplier_id uuid, p_color_code text)
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT color_variation_id
  FROM vw_color_mapping
  WHERE supplier_id    = p_supplier_id
    AND supplier_code  = p_color_code
    AND rank           = 1
  LIMIT 1;
$function$
