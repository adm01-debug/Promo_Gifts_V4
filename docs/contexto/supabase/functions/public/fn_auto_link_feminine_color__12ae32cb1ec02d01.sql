CREATE OR REPLACE FUNCTION public.fn_auto_link_feminine_color()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    -- IDs fixos das datas comemorativas
    v_dia_mulher_id UUID := 'ba801bb8-b48f-4b02-be72-4670584d92c0';   -- Dia Internacional da Mulher (8/mar)
    v_dia_maes_id UUID := 'cdecfcac-e4f4-43a3-8839-196acf05ee5b';     -- Dia das Mães (maio)
    v_is_feminine BOOLEAN := FALSE;
    v_color_group_id UUID;
BEGIN
    -- Verifica se a variante tem cor definida
    IF NEW.color_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Busca o group_id da cor na tabela color_variations
    SELECT cv.group_id INTO v_color_group_id
    FROM color_variations cv
    WHERE cv.id = NEW.color_id;
    
    -- Se não encontrou em color_variations, tenta em supplier_colors via color_equivalences
    IF v_color_group_id IS NULL THEN
        -- Busca via mapeamento supplier_colors → color_variations → group_id
        SELECT cv.group_id INTO v_color_group_id
        FROM color_equivalences ce
        JOIN color_variations cv ON cv.id = ce.promo_variation_id
        WHERE ce.supplier_color_id = NEW.color_id;
    END IF;
    
    -- Verifica se o grupo de cor é feminino
    IF v_color_group_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM feminine_color_config 
            WHERE color_group_id = v_color_group_id
              AND is_active = TRUE
        ) INTO v_is_feminine;
    END IF;
    
    IF v_is_feminine THEN
        
        -- ═══════════════════════════════════════════════════════════════════
        -- LINK 1: Atualizar target_audience do PRODUTO pai
        -- CORREÇÃO: Usar ARRAY em vez de TEXT simples
        -- ═══════════════════════════════════════════════════════════════════
        UPDATE products
        SET target_audience = CASE 
                WHEN target_audience IS NULL THEN ARRAY['feminino']
                WHEN NOT ('feminino' = ANY(target_audience)) THEN array_append(target_audience, 'feminino')
                ELSE target_audience
            END,
            updated_at = NOW()
        WHERE id = NEW.product_id;
        
        -- ═══════════════════════════════════════════════════════════════════
        -- LINK 2: Data Comemorativa DIA INTERNACIONAL DA MULHER
        -- ═══════════════════════════════════════════════════════════════════
        INSERT INTO product_commemorative_dates (
            product_id,
            commemorative_date_id,
            created_at
        )
        VALUES (
            NEW.product_id,
            v_dia_mulher_id,
            NOW()
        )
        ON CONFLICT (product_id, commemorative_date_id) DO NOTHING;
        
        -- ═══════════════════════════════════════════════════════════════════
        -- LINK 3: Data Comemorativa DIA DAS MÃES
        -- ═══════════════════════════════════════════════════════════════════
        INSERT INTO product_commemorative_dates (
            product_id,
            commemorative_date_id,
            created_at
        )
        VALUES (
            NEW.product_id,
            v_dia_maes_id,
            NOW()
        )
        ON CONFLICT (product_id, commemorative_date_id) DO NOTHING;
        
        -- Log opcional (pode comentar em produção)
        RAISE NOTICE 'Auto-link FEMININO: Produto % vinculado a target_audience=feminino, Dia da Mulher e Dia das Mães', NEW.product_id;
        
    END IF;
    
    RETURN NEW;
END;
$function$
