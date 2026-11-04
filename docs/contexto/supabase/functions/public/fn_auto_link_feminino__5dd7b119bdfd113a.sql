CREATE OR REPLACE FUNCTION public.fn_auto_link_feminino(p_product_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_color_name TEXT;
    v_is_feminine BOOLEAN := FALSE;
    v_feminine_tag_id UUID;
    v_feminine_colors TEXT[] := ARRAY[
        'rosa', 'pink', 'roxo', 'purple', 'lilás', 'lilac', 'violeta', 'violet',
        'rose', 'magenta', 'fuchsia', 'lavanda', 'lavender'
    ];
    i INTEGER;
BEGIN
    -- 1. Primeiro tentar em raw_data (mais confiável para produtos novos)
    SELECT LOWER(raw_data->>'Colors')
    INTO v_color_name
    FROM supplier_products_raw
    WHERE product_id = p_product_id
    LIMIT 1;
    
    -- Se não encontrou, tentar em product_variants
    IF v_color_name IS NULL OR v_color_name = '' THEN
        SELECT LOWER(pv.color_name) INTO v_color_name
        FROM product_variants pv
        WHERE pv.product_id = p_product_id
          AND pv.color_name IS NOT NULL
        LIMIT 1;
    END IF;
    
    IF v_color_name IS NULL OR v_color_name = '' THEN
        RETURN FALSE;
    END IF;
    
    -- 2. Verificar se tem cor feminina
    FOR i IN 1..array_length(v_feminine_colors, 1)
    LOOP
        IF v_color_name ILIKE '%' || v_feminine_colors[i] || '%' THEN
            v_is_feminine := TRUE;
            EXIT;
        END IF;
    END LOOP;
    
    -- 3. Se é feminino, vincular tag
    IF v_is_feminine THEN
        -- Buscar tag Feminino
        SELECT id INTO v_feminine_tag_id
        FROM tags
        WHERE LOWER(name) IN ('feminino', 'feminine', 'mulher', 'women', 'para ela', 'for her')
           OR LOWER(slug) IN ('feminino', 'feminine', 'mulher', 'women')
        LIMIT 1;
        
        IF v_feminine_tag_id IS NOT NULL THEN
            INSERT INTO product_tags (product_id, tag_id, created_at)
            VALUES (p_product_id, v_feminine_tag_id, NOW())
            ON CONFLICT (product_id, tag_id) DO NOTHING;
            
            RAISE NOTICE 'FEMININO tag vinculada para produto %', p_product_id;
        ELSE
            RAISE NOTICE 'Tag FEMININO não encontrada no banco';
        END IF;
        
        -- Atualizar target_audience do produto (se campo existir)
        BEGIN
            UPDATE products SET 
                target_audience = COALESCE(target_audience, 'feminino'),
                updated_at = NOW()
            WHERE id = p_product_id
              AND (target_audience IS NULL OR target_audience = '');
        EXCEPTION WHEN OTHERS THEN
            -- Campo pode não existir, ignorar
            NULL;
        END;
    END IF;
    
    RETURN v_is_feminine;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro vinculando FEMININO do produto %: %', p_product_id, SQLERRM;
    RETURN FALSE;
END;
$function$
