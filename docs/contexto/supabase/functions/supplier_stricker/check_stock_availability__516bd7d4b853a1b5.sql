CREATE OR REPLACE FUNCTION supplier_stricker.check_stock_availability(p_sku character varying, p_quantity integer)
 RETURNS TABLE(is_available boolean, current_stock integer, next_restock_date date, next_restock_qty integer)
 LANGUAGE plpgsql
 SET search_path TO 'supplier_stricker', 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        s.stock_quantity >= p_quantity,
        s.stock_quantity,
        s.next_date_1,
        s.next_quantity_1
    FROM supplier_stricker.stocks s
    WHERE s.sku = p_sku;
END;
$function$
