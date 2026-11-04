CREATE OR REPLACE FUNCTION public.fn_auto_link_eco(p_product_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_material_name TEXT;
    v_is_eco BOOLEAN := FALSE;
    v_eco_tag_id UUID;
    v_eco_materials TEXT[] := ARRAY[
        'bambu', 'bamboo', 'cortiça', 'cork', 'juta', 'juco',
        'algodão orgânico', 'organic cotton', 'reciclado', 'recycled',
        'rpet', 'pet reciclado', 'kraft', 'palha de trigo', 'wheat straw',
        'fibra de bambu', 'bamboo fiber', 'madeira', 'wood', 'algodão reciclado'
    ];
    i INTEGER;
BEGIN
    -- 1. Buscar material do produto (primeiro de product_materials)
    SELECT LOWER(mt.name) INTO v_material_name
    FROM product_materials pm
    JOIN material_types mt ON mt.id = pm.material_id
    WHERE pm.product_id = p_product_id
    LIMIT 1;
    
    -- Se não encontrou em product_materials, tentar em supplier_products_raw
    IF v_material_name IS NULL THEN
        SELECT LOWER(raw_data->>'Materials')
        INTO v_material_name
        FROM supplier_products_raw
        WHERE product_id = p_product_id
        LIMIT 1;
    END IF;
    
    IF v_material_name IS NULL OR v_material_name = '' THEN
        RETURN FALSE;
    END IF;
    
    -- 2. Verificar se é material ECO
    FOR i IN 1..array_length(v_eco_materials, 1)
    LOOP
        IF v_material_name ILIKE '%' || v_eco_materials[i] || '%' THEN
            v_is_eco := TRUE;
            EXIT;
        END IF;
    END LOOP;
    
    -- 3. Se é ECO, vincular tag
    IF v_is_eco THEN
        -- Buscar tag ECO (pode ter vários nomes)
        SELECT id INTO v_eco_tag_id
        FROM tags
        WHERE LOWER(name) IN ('eco-friendly', 'ecológico', 'sustentável', 'eco', 'sustentavel')
           OR LOWER(slug) IN ('eco-friendly', 'ecologico', 'sustentavel', 'eco')
        LIMIT 1;
        
        IF v_eco_tag_id IS NOT NULL THEN
            INSERT INTO product_tags (product_id, tag_id, created_at)
            VALUES (p_product_id, v_eco_tag_id, NOW())
            ON CONFLICT (product_id, tag_id) DO NOTHING;
            
            RAISE NOTICE 'ECO tag vinculada para produto %', p_product_id;
        ELSE
            RAISE NOTICE 'Tag ECO não encontrada no banco';
        END IF;
    END IF;
    
    RETURN v_is_eco;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro vinculando ECO do produto %: %', p_product_id, SQLERRM;
    RETURN FALSE;
END;
$function$
