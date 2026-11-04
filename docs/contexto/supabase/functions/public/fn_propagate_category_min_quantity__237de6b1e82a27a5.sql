CREATE OR REPLACE FUNCTION public.fn_propagate_category_min_quantity(p_category_id uuid, p_new_min_quantity integer)
 RETURNS TABLE(updated_products integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_updated INTEGER;
BEGIN
    -- Atualizar todos os produtos da categoria que NÃO têm override
    UPDATE products
    SET min_quantity = p_new_min_quantity
    WHERE category_id = p_category_id
      AND min_order_quantity IS NULL;
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    RETURN QUERY SELECT v_updated;
END;
$function$
