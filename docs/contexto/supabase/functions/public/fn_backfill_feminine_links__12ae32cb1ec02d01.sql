CREATE OR REPLACE FUNCTION public.fn_backfill_feminine_links()
 RETURNS TABLE(variantes_processadas integer, produtos_atualizados integer, links_dia_mulher_criados integer, links_dia_maes_criados integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_dia_mulher_id UUID := 'ba801bb8-b48f-4b02-be72-4670584d92c0';
    v_dia_maes_id UUID := 'cdecfcac-e4f4-43a3-8839-196acf05ee5b';
    v_variantes INTEGER;
    v_produtos INTEGER;
    v_mulher_links INTEGER;
    v_maes_links INTEGER;
BEGIN
    -- Contar variantes com cores femininas
    SELECT COUNT(DISTINCT pv.id)
    INTO v_variantes
    FROM product_variants pv
    JOIN color_variations cv ON cv.id = pv.color_id
    JOIN feminine_color_config fcc ON fcc.color_group_id = cv.group_id
    WHERE fcc.is_active = TRUE;
    
    -- Atualizar target_audience dos produtos (CORREÇÃO: usar ARRAY)
    WITH updated AS (
        UPDATE products p
        SET target_audience = CASE 
                WHEN p.target_audience IS NULL THEN ARRAY['feminino']
                WHEN NOT ('feminino' = ANY(p.target_audience)) THEN array_append(p.target_audience, 'feminino')
                ELSE p.target_audience
            END,
            updated_at = NOW()
        FROM product_variants pv
        JOIN color_variations cv ON cv.id = pv.color_id
        JOIN feminine_color_config fcc ON fcc.color_group_id = cv.group_id
        WHERE p.id = pv.product_id
          AND fcc.is_active = TRUE
          AND (p.target_audience IS NULL OR NOT ('feminino' = ANY(p.target_audience)))
        RETURNING p.id
    )
    SELECT COUNT(DISTINCT id) INTO v_produtos FROM updated;
    
    -- Inserir links Dia da Mulher
    WITH inserted AS (
        INSERT INTO product_commemorative_dates (product_id, commemorative_date_id, created_at)
        SELECT DISTINCT pv.product_id, v_dia_mulher_id, NOW()
        FROM product_variants pv
        JOIN color_variations cv ON cv.id = pv.color_id
        JOIN feminine_color_config fcc ON fcc.color_group_id = cv.group_id
        WHERE fcc.is_active = TRUE
        ON CONFLICT (product_id, commemorative_date_id) DO NOTHING
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_mulher_links FROM inserted;
    
    -- Inserir links Dia das Mães
    WITH inserted AS (
        INSERT INTO product_commemorative_dates (product_id, commemorative_date_id, created_at)
        SELECT DISTINCT pv.product_id, v_dia_maes_id, NOW()
        FROM product_variants pv
        JOIN color_variations cv ON cv.id = pv.color_id
        JOIN feminine_color_config fcc ON fcc.color_group_id = cv.group_id
        WHERE fcc.is_active = TRUE
        ON CONFLICT (product_id, commemorative_date_id) DO NOTHING
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_maes_links FROM inserted;
    
    RETURN QUERY SELECT v_variantes, v_produtos, v_mulher_links, v_maes_links;
END;
$function$
