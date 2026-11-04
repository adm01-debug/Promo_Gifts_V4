CREATE OR REPLACE FUNCTION public.fn_batch_populate_packing(p_limit integer DEFAULT 100)
 RETURNS TABLE(processed integer, updated integer, commercial integer, protective integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_processed INTEGER := 0;
    v_updated INTEGER := 0;
    v_commercial INTEGER := 0;
    v_protective INTEGER := 0;
    v_product RECORD;
    v_packing TEXT;
    v_classification JSONB;
BEGIN
    FOR v_product IN 
        SELECT p.id, p.sku
        FROM products p
        WHERE p.packing_classification IS NULL
          AND p.sku LIKE 'SPOT-%'
        LIMIT p_limit
    LOOP
        v_processed := v_processed + 1;
        
        -- CORRIGIDO: Usar product_id diretamente
        SELECT DISTINCT raw_data->>'Packing' INTO v_packing
        FROM supplier_products_raw spr
        WHERE spr.product_id = v_product.id
          AND raw_data->>'Packing' IS NOT NULL
          AND raw_data->>'Packing' <> ''
        LIMIT 1;
        
        IF v_packing IS NOT NULL AND v_packing <> '' THEN
            v_classification := fn_classify_packing_type(v_packing);
            
            IF v_classification IS NOT NULL THEN
                UPDATE products
                SET packing_type = v_packing,
                    packing_classification = (v_classification->>'classification')::VARCHAR
                WHERE id = v_product.id;
                
                v_updated := v_updated + 1;
                
                IF (v_classification->>'classification') = 'commercial' THEN
                    v_commercial := v_commercial + 1;
                ELSIF (v_classification->>'classification') = 'protective' THEN
                    v_protective := v_protective + 1;
                END IF;
            END IF;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT v_processed, v_updated, v_commercial, v_protective;
END;
$function$
