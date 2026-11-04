CREATE OR REPLACE FUNCTION public.generate_promo_sku(p_supplier_code text, p_reference text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN UPPER(p_supplier_code) || '-' || UPPER(p_reference);
END;
$function$
