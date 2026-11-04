CREATE OR REPLACE FUNCTION public.fn_update_product_dimensions()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_updated INTEGER := 0;
    v_errors INTEGER := 0;
    v_error_details JSONB := '[]'::JSONB;
    v_product RECORD;
    v_dim_result JSONB;
    v_weight_result JSONB;
    v_capacity_value NUMERIC;
BEGIN
    FOR v_product IN (
        SELECT DISTINCT ON (p.id)
            p.id AS product_id,
            p.sku,
            spr.raw_data->>'CombinedSizes' AS combined_sizes,
            (spr.raw_data->>'Weight')::NUMERIC AS weight,
            (spr.raw_data->>'BoxQuantity')::INTEGER AS box_quantity,
            (spr.raw_data->>'BoxInnerQuantity')::INTEGER AS box_inner_quantity,
            (spr.raw_data->>'BoxWeightKG')::NUMERIC AS box_weight_kg,
            (spr.raw_data->>'BoxWidthMM')::NUMERIC AS box_width_m,
            (spr.raw_data->>'BoxHeightMM')::NUMERIC AS box_height_m,
            (spr.raw_data->>'BoxLengthMM')::NUMERIC AS box_length_m,
            (spr.raw_data->>'BoxVolume')::NUMERIC AS box_volume_m3,
            spr.raw_data->>'Capacity' AS capacity_text
        FROM products p
        JOIN supplier_products_raw spr ON spr.product_id = p.id
        WHERE spr.raw_data IS NOT NULL
          AND spr.raw_data->>'CombinedSizes' IS NOT NULL
        ORDER BY p.id, spr.created_at DESC
    )
    LOOP
        BEGIN
            -- 1. PARSE DAS DIMENSÕES
            v_dim_result := NULL;
            IF v_product.combined_sizes IS NOT NULL 
               AND v_product.combined_sizes != ''
               AND v_product.combined_sizes NOT ILIKE '%Tamanhos:%'
            THEN
                v_dim_result := fn_parse_product_dimensions(v_product.combined_sizes);
            END IF;
            
            -- 2. PARSE DO PESO
            v_weight_result := NULL;
            IF v_product.weight IS NOT NULL AND v_product.weight > 0 THEN
                v_weight_result := fn_parse_product_weight(
                    p_weight := v_product.weight,
                    p_weight_unit := 'g',
                    p_box_weight_kg := v_product.box_weight_kg,
                    p_box_quantity := v_product.box_quantity
                );
            END IF;
            
            -- 3. EXTRAIR CAPACIDADE
            v_capacity_value := NULL;
            IF v_product.capacity_text IS NOT NULL AND v_product.capacity_text != '' THEN
                v_capacity_value := (
                    REGEXP_REPLACE(v_product.capacity_text, '[^0-9.]', '', 'g')
                )::NUMERIC;
                IF v_capacity_value < 1 THEN
                    v_capacity_value := NULL;
                END IF;
            END IF;
            
            -- 4. UPDATE DO PRODUTO
            UPDATE products
            SET
                combined_sizes = v_product.combined_sizes,
                dimensions_display = v_product.combined_sizes,
                width_cm = COALESCE((v_dim_result->>'width_cm')::NUMERIC, width_cm),
                height_cm = COALESCE((v_dim_result->>'height_cm')::NUMERIC, height_cm),
                length_cm = COALESCE((v_dim_result->>'length_cm')::NUMERIC, length_cm),
                diameter_cm = COALESCE((v_dim_result->>'diameter_cm')::NUMERIC, diameter_cm),
                shape_type = COALESCE(v_dim_result->>'shape_type', shape_type),
                dimensions = CASE 
                    WHEN v_dim_result IS NOT NULL AND v_dim_result->>'error' IS NULL
                    THEN jsonb_build_object(
                        'width_cm', (v_dim_result->>'width_cm')::NUMERIC,
                        'height_cm', (v_dim_result->>'height_cm')::NUMERIC,
                        'length_cm', (v_dim_result->>'length_cm')::NUMERIC,
                        'diameter_cm', (v_dim_result->>'diameter_cm')::NUMERIC,
                        'shape_type', v_dim_result->>'shape_type',
                        'unit_detected', v_dim_result->>'unit_detected'
                    )
                    ELSE dimensions
                END,
                -- ✅ CAMPO ÚNICO DE PESO (weight_g)
                weight_g = COALESCE((v_weight_result->>'weight_g')::NUMERIC, weight_g),
                -- ❌ REMOVIDO: product_weight_g (duplicata eliminada)
                box_quantity = COALESCE(v_product.box_quantity, box_quantity),
                box_inner_quantity = COALESCE(
                    NULLIF(v_product.box_inner_quantity, 0), 
                    box_inner_quantity
                ),
                box_weight_kg = COALESCE(v_product.box_weight_kg, box_weight_kg),
                box_width_mm = COALESCE(
                    CASE WHEN v_product.box_width_m > 0 
                         THEN v_product.box_width_m * 1000 
                         ELSE NULL END,
                    box_width_mm
                ),
                box_height_mm = COALESCE(
                    CASE WHEN v_product.box_height_m > 0 
                         THEN v_product.box_height_m * 1000 
                         ELSE NULL END,
                    box_height_mm
                ),
                box_length_mm = COALESCE(
                    CASE WHEN v_product.box_length_m > 0 
                         THEN v_product.box_length_m * 1000 
                         ELSE NULL END,
                    box_length_mm
                ),
                box_volume_cm3 = COALESCE(
                    CASE WHEN v_product.box_volume_m3 > 0 
                         THEN v_product.box_volume_m3 * 1000000 
                         ELSE NULL END,
                    box_volume_cm3
                ),
                capacity_ml = COALESCE(v_capacity_value, capacity_ml),
                updated_at = NOW()
            WHERE id = v_product.product_id;
            
            v_updated := v_updated + 1;
            
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
            v_error_details := v_error_details || jsonb_build_object(
                'product_id', v_product.product_id,
                'sku', v_product.sku,
                'error', SQLERRM
            );
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'updated', v_updated,
        'errors', v_errors,
        'error_details', v_error_details
    );
END;
$function$
