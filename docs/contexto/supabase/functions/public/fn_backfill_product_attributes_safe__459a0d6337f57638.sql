CREATE OR REPLACE FUNCTION public.fn_backfill_product_attributes_safe(p_batch_size integer DEFAULT 100, p_dry_run boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_product RECORD;
    v_colors TEXT[];
    v_capacity INTEGER;
    v_dimensions JSONB;
    v_weight INTEGER;
    v_processed INTEGER := 0;
    v_updated INTEGER := 0;
    v_sample JSONB[] := '{}';
BEGIN
    FOR v_product IN (
        SELECT id, name
        FROM products
        WHERE name IS NOT NULL
          AND (
            (colors IS NULL OR jsonb_array_length(colors) = 0)
            OR capacity_ml IS NULL
          )
        ORDER BY created_at DESC
        LIMIT p_batch_size
    ) LOOP
        v_processed := v_processed + 1;
        
        -- Extrair atributos do nome
        v_colors := fn_extract_color_from_name(v_product.name);
        v_capacity := fn_extract_capacity_from_name(v_product.name);
        v_dimensions := fn_extract_dimensions_from_name(v_product.name);
        v_weight := fn_extract_weight_from_name(v_product.name);
        
        -- Verificar se tem algo para atualizar
        IF array_length(v_colors, 1) > 0 OR 
           v_capacity IS NOT NULL OR
           v_weight IS NOT NULL OR
           v_dimensions IS NOT NULL THEN
            
            IF NOT p_dry_run THEN
                -- ⚠️ NÃO ATUALIZA materials (evita erro de trigger)
                UPDATE products SET
                    colors = CASE WHEN array_length(v_colors, 1) > 0 THEN to_jsonb(v_colors) ELSE colors END,
                    has_colors = CASE WHEN array_length(v_colors, 1) > 0 THEN true ELSE has_colors END,
                    capacity_ml = COALESCE(v_capacity, capacity_ml),
                    has_capacity = CASE WHEN v_capacity IS NOT NULL THEN true ELSE has_capacity END,
                    length_cm = COALESCE((v_dimensions->>'length_cm')::NUMERIC, length_cm),
                    width_cm = COALESCE((v_dimensions->>'width_cm')::NUMERIC, width_cm),
                    height_cm = COALESCE((v_dimensions->>'height_cm')::NUMERIC, height_cm),
                    weight_g = COALESCE(v_weight, weight_g)
                WHERE id = v_product.id;
            END IF;
            
            v_updated := v_updated + 1;
            
            IF v_updated <= 5 THEN
                v_sample := array_append(v_sample, jsonb_build_object(
                    'name', LEFT(v_product.name, 50),
                    'colors', v_colors,
                    'capacity_ml', v_capacity,
                    'weight_g', v_weight
                ));
            END IF;
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'processed', v_processed,
        'updated', v_updated,
        'dry_run', p_dry_run,
        'sample', to_jsonb(v_sample)
    );
END;
$function$
