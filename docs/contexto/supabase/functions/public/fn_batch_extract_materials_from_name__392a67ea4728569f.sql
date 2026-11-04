CREATE OR REPLACE FUNCTION public.fn_batch_extract_materials_from_name(p_limit integer DEFAULT 100)
 RETURNS TABLE(processed integer, total_materials integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_product RECORD;
    v_processed INTEGER := 0;
    v_total_materials INTEGER := 0;
    v_materials INTEGER;
BEGIN
    -- Processar produtos sem vínculos em product_materials
    FOR v_product IN 
        SELECT p.id, p.name
        FROM products p
        LEFT JOIN product_materials pm ON pm.product_id = p.id
        WHERE pm.id IS NULL
          AND p.name IS NOT NULL
        LIMIT p_limit
    LOOP
        v_materials := fn_extract_materials_from_name(v_product.id, FALSE);
        v_total_materials := v_total_materials + v_materials;
        v_processed := v_processed + 1;
    END LOOP;
    
    RETURN QUERY SELECT v_processed, v_total_materials;
END;
$function$
