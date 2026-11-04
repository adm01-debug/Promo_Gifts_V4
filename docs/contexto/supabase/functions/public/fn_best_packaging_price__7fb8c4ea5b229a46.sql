CREATE OR REPLACE FUNCTION public.fn_best_packaging_price(p_packaging_id uuid, p_quantity integer DEFAULT 1)
 RETURNS TABLE(supplier_id uuid, supplier_name character varying, unit_price numeric, total_price numeric, lead_time_days integer)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        sp.supplier_id,
        s.name as supplier_name,
        sp.unit_price,
        (sp.unit_price * p_quantity) as total_price,
        sp.lead_time_days
    FROM supplier_packagings sp
    JOIN suppliers s ON s.id = sp.supplier_id
    WHERE sp.packaging_id = p_packaging_id
      AND sp.active = TRUE
      AND sp.is_available = TRUE
      AND sp.min_order_quantity <= p_quantity
    ORDER BY sp.unit_price ASC
    LIMIT 5;
END;
$function$
