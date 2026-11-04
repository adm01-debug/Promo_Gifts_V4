CREATE OR REPLACE FUNCTION public.fn_sync_single_product_dimensions(p_product_id uuid, p_raw_data jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_combined_sizes TEXT;
    v_weight NUMERIC;
    v_weight_unit TEXT;
    v_box_quantity INT;
    v_box_weight_kg NUMERIC;
    v_box_width NUMERIC;
    v_box_height NUMERIC;
    v_box_length NUMERIC;
    v_box_volume NUMERIC;
    v_capacity TEXT;
    v_parsed_dims JSONB;
    v_parsed_weight JSONB;
    v_current_combined TEXT;
    v_rows_updated INT;
BEGIN
    -- Verificar se product_id é válido
    IF p_product_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Extrair CombinedSizes do raw_data
    v_combined_sizes := TRIM(p_raw_data->>'CombinedSizes');
    
    -- Verificar se combined_sizes já é igual (evita update redundante)
    SELECT combined_sizes INTO v_current_combined
    FROM products
    WHERE id = p_product_id;
    
    -- Se já é igual, não faz nada (performance)
    IF v_current_combined IS NOT DISTINCT FROM v_combined_sizes THEN
        RETURN FALSE; -- Nenhuma atualização necessária
    END IF;
    
    -- Extrair outros campos
    v_weight := NULLIF(TRIM(p_raw_data->>'Weight'), '')::NUMERIC;
    v_weight_unit := COALESCE(NULLIF(TRIM(p_raw_data->>'WeightUnit'), ''), 'g');
    v_box_quantity := NULLIF(TRIM(p_raw_data->>'BoxQuantity'), '')::INT;
    v_box_weight_kg := NULLIF(TRIM(p_raw_data->>'BoxWeightKG'), '')::NUMERIC;
    v_capacity := NULLIF(TRIM(p_raw_data->>'Capacity'), '');
    
    -- Extrair dimensões da caixa (ATENÇÃO: SPOT usa METROS, não mm!)
    -- BoxWidthMM, BoxHeightMM, BoxLengthMM estão em METROS na API SPOT
    v_box_width := NULLIF(TRIM(p_raw_data->>'BoxWidthMM'), '')::NUMERIC;
    v_box_height := NULLIF(TRIM(p_raw_data->>'BoxHeightMM'), '')::NUMERIC;
    v_box_length := NULLIF(TRIM(p_raw_data->>'BoxLengthMM'), '')::NUMERIC;
    v_box_volume := NULLIF(TRIM(p_raw_data->>'BoxVolume'), '')::NUMERIC;
    
    -- Converter metros para mm (se valores pequenos, são metros)
    IF v_box_width IS NOT NULL AND v_box_width < 10 THEN
        v_box_width := v_box_width * 1000; -- metros → mm
    END IF;
    IF v_box_height IS NOT NULL AND v_box_height < 10 THEN
        v_box_height := v_box_height * 1000;
    END IF;
    IF v_box_length IS NOT NULL AND v_box_length < 10 THEN
        v_box_length := v_box_length * 1000;
    END IF;
    
    -- Parsear dimensões
    IF v_combined_sizes IS NOT NULL AND v_combined_sizes != '' THEN
        v_parsed_dims := fn_parse_product_dimensions(v_combined_sizes);
    ELSE
        v_parsed_dims := '{}'::JSONB;
    END IF;
    
    -- Parsear peso
    IF v_weight IS NOT NULL THEN
        v_parsed_weight := fn_parse_product_weight(v_weight, v_weight_unit);
    ELSE
        v_parsed_weight := '{}'::JSONB;
    END IF;
    
    -- Atualizar produto (usando IS DISTINCT FROM para evitar updates desnecessários)
    UPDATE products SET
        -- Dimensões do produto
        combined_sizes = v_combined_sizes,
        dimensions_display = v_combined_sizes,
        width_cm = (v_parsed_dims->>'width_cm')::NUMERIC,
        height_cm = (v_parsed_dims->>'height_cm')::NUMERIC,
        length_cm = (v_parsed_dims->>'length_cm')::NUMERIC,
        diameter_cm = (v_parsed_dims->>'diameter_cm')::NUMERIC,
        shape_type = v_parsed_dims->>'shape_type',
        dimensions = v_parsed_dims,
        
        -- Peso
        weight_g = COALESCE((v_parsed_weight->>'weight_g')::NUMERIC, v_weight),
        product_weight_g = COALESCE((v_parsed_weight->>'weight_g')::NUMERIC, v_weight),
        
        -- Dados da caixa
        box_quantity = v_box_quantity,
        box_weight_kg = v_box_weight_kg,
        box_width_mm = v_box_width,
        box_height_mm = v_box_height,
        box_length_mm = v_box_length,
        box_volume_cm3 = CASE 
            WHEN v_box_volume IS NOT NULL THEN v_box_volume * 1000000 -- m³ → cm³
            WHEN v_box_width IS NOT NULL AND v_box_height IS NOT NULL AND v_box_length IS NOT NULL 
            THEN (v_box_width / 10) * (v_box_height / 10) * (v_box_length / 10) -- mm → cm, depois multiplica
            ELSE NULL
        END,
        
        -- Capacidade
        capacity_ml = CASE 
            WHEN v_capacity ~ '\d+' THEN 
                (REGEXP_REPLACE(v_capacity, '[^\d.]', '', 'g'))::NUMERIC
            ELSE NULL
        END,
        
        -- Timestamp
        updated_at = NOW()
    WHERE id = p_product_id
    AND (
        combined_sizes IS DISTINCT FROM v_combined_sizes
        OR weight_g IS DISTINCT FROM COALESCE((v_parsed_weight->>'weight_g')::NUMERIC, v_weight)
        OR box_quantity IS DISTINCT FROM v_box_quantity
    );
    
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    
    RETURN v_rows_updated > 0;
    
EXCEPTION WHEN OTHERS THEN
    -- Log de erro (opcional - pode ser removido em produção)
    RAISE WARNING 'fn_sync_single_product_dimensions error for product %: %', p_product_id, SQLERRM;
    RETURN FALSE;
END;
$function$
