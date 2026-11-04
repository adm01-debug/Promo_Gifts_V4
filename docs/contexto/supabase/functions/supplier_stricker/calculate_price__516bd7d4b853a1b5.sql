CREATE OR REPLACE FUNCTION supplier_stricker.calculate_price(p_sku character varying, p_quantity integer)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO 'supplier_stricker', 'public'
AS $function$
DECLARE
    v_price DECIMAL(10,2);
BEGIN
    SELECT 
        CASE 
            WHEN p_quantity >= min_qty_5 AND price_5 IS NOT NULL THEN price_5
            WHEN p_quantity >= min_qty_4 AND price_4 IS NOT NULL THEN price_4
            WHEN p_quantity >= min_qty_3 AND price_3 IS NOT NULL THEN price_3
            WHEN p_quantity >= min_qty_2 AND price_2 IS NOT NULL THEN price_2
            ELSE price_1
        END
    INTO v_price
    FROM supplier_stricker.optionals
    WHERE sku = p_sku;
    
    RETURN v_price;
END;
$function$
