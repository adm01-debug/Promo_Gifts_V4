CREATE OR REPLACE FUNCTION public.fn_recalculate_all_stock()
 RETURNS TABLE(variants_updated integer, products_updated integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_variants_updated INTEGER := 0;
    v_products_updated INTEGER := 0;
BEGIN
    -- Atualizar todas as variantes
    WITH vss_totals AS (
        SELECT 
            variant_id,
            COALESCE(SUM(quantity), 0) as total_qty
        FROM variant_supplier_sources
        WHERE is_active = true
        GROUP BY variant_id
    )
    UPDATE product_variants pv
    SET stock_quantity = COALESCE(vt.total_qty, 0)
    FROM vss_totals vt
    WHERE pv.id = vt.variant_id
      AND pv.stock_quantity IS DISTINCT FROM COALESCE(vt.total_qty, 0);
    
    GET DIAGNOSTICS v_variants_updated = ROW_COUNT;
    
    -- Atualizar todos os produtos
    WITH pv_totals AS (
        SELECT 
            product_id,
            COALESCE(SUM(stock_quantity), 0) as total_qty
        FROM product_variants
        WHERE is_active = true
        GROUP BY product_id
    )
    UPDATE products p
    SET 
        stock_quantity = COALESCE(pt.total_qty, 0),
        is_stockout = (COALESCE(pt.total_qty, 0) = 0),
        last_stock_update_at = NOW()
    FROM pv_totals pt
    WHERE p.id = pt.product_id
      AND (p.stock_quantity IS DISTINCT FROM COALESCE(pt.total_qty, 0)
           OR p.is_stockout IS DISTINCT FROM (COALESCE(pt.total_qty, 0) = 0));
    
    GET DIAGNOSTICS v_products_updated = ROW_COUNT;
    
    RETURN QUERY SELECT v_variants_updated, v_products_updated;
END;
$function$
