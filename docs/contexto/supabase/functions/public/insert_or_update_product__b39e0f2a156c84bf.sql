CREATE OR REPLACE FUNCTION public.insert_or_update_product(p_supplier_id uuid, p_supplier_reference text, p_product_data jsonb, p_organization_id uuid DEFAULT '5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_product_id UUID;
    v_existing_id UUID;
    v_sku TEXT;
    v_supplier_code TEXT;
BEGIN
    -- Obter código do fornecedor
    SELECT code INTO v_supplier_code FROM suppliers WHERE id = p_supplier_id;
    
    -- Gerar SKU padrão
    v_sku := v_supplier_code || '-' || p_supplier_reference;
    
    -- Verificar se produto já existe (por supplier_reference + supplier_id)
    SELECT p.id INTO v_existing_id
    FROM products p
    WHERE p.supplier_reference = p_supplier_reference
    AND p.supplier_id = p_supplier_id;
    
    IF v_existing_id IS NOT NULL THEN
        -- UPDATE
        UPDATE products SET
            name = COALESCE(p_product_data->>'name', name),
            description = COALESCE(p_product_data->>'description', description),
            short_description = COALESCE(p_product_data->>'short_description', short_description),
            height_cm = COALESCE((p_product_data->>'height_cm')::NUMERIC, height_cm),
            width_cm = COALESCE((p_product_data->>'width_cm')::NUMERIC, width_cm),
            length_cm = COALESCE((p_product_data->>'length_cm')::NUMERIC, length_cm),
            weight = COALESCE((p_product_data->>'weight')::NUMERIC, weight),
            weight_g = COALESCE((p_product_data->>'weight_g')::INTEGER, weight_g),
            box_height_cm = COALESCE((p_product_data->>'box_height_cm')::NUMERIC, box_height_cm),
            box_width_cm = COALESCE((p_product_data->>'box_width_cm')::NUMERIC, box_width_cm),
            box_length_cm = COALESCE((p_product_data->>'box_length_cm')::NUMERIC, box_length_cm),
            box_weight_kg = COALESCE((p_product_data->>'box_weight_kg')::NUMERIC, box_weight_kg),
            box_quantity = COALESCE((p_product_data->>'box_quantity')::INTEGER, box_quantity),
            suggested_price = COALESCE((p_product_data->>'suggested_price')::NUMERIC, suggested_price),
            ncm_code = COALESCE(p_product_data->>'ncm_code', ncm_code),
            primary_image_url = COALESCE(p_product_data->>'primary_image_url', primary_image_url),
            dimensions_display = COALESCE(p_product_data->>'dimensions_display', dimensions_display),
            is_active = COALESCE((p_product_data->>'is_active')::BOOLEAN, is_active),
            sync_status = 'synced',
            last_sync_at = NOW(),
            updated_at = NOW()
        WHERE id = v_existing_id;
        
        v_product_id := v_existing_id;
    ELSE
        -- INSERT
        INSERT INTO products (
            id,
            organization_id,
            supplier_id,
            supplier_reference,
            sku,
            name,
            description,
            short_description,
            height_cm,
            width_cm,
            length_cm,
            weight,
            weight_g,
            box_height_cm,
            box_width_cm,
            box_length_cm,
            box_weight_kg,
            box_quantity,
            suggested_price,
            ncm_code,
            primary_image_url,
            dimensions_display,
            is_active,
            sync_status,
            last_sync_at,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            p_organization_id,
            p_supplier_id,
            p_supplier_reference,
            v_sku,
            p_product_data->>'name',
            p_product_data->>'description',
            p_product_data->>'short_description',
            (p_product_data->>'height_cm')::NUMERIC,
            (p_product_data->>'width_cm')::NUMERIC,
            (p_product_data->>'length_cm')::NUMERIC,
            (p_product_data->>'weight')::NUMERIC,
            (p_product_data->>'weight_g')::INTEGER,
            (p_product_data->>'box_height_cm')::NUMERIC,
            (p_product_data->>'box_width_cm')::NUMERIC,
            (p_product_data->>'box_length_cm')::NUMERIC,
            (p_product_data->>'box_weight_kg')::NUMERIC,
            (p_product_data->>'box_quantity')::INTEGER,
            (p_product_data->>'suggested_price')::NUMERIC,
            p_product_data->>'ncm_code',
            p_product_data->>'primary_image_url',
            p_product_data->>'dimensions_display',
            COALESCE((p_product_data->>'is_active')::BOOLEAN, true),
            'synced',
            NOW(),
            NOW(),
            NOW()
        )
        RETURNING id INTO v_product_id;
    END IF;
    
    RETURN v_product_id;
END;
$function$
