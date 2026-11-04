CREATE OR REPLACE FUNCTION public.debug_automations(p_product_id uuid)
 RETURNS TABLE(check_name text, check_result text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_raw_data JSONB;
    v_materials TEXT;
    v_colors TEXT;
BEGIN
    -- Buscar raw_data
    SELECT raw_data INTO v_raw_data
    FROM supplier_products_raw
    WHERE product_id = p_product_id
    LIMIT 1;
    
    check_name := '1. raw_data encontrado';
    check_result := CASE WHEN v_raw_data IS NOT NULL THEN 'SIM' ELSE 'NÃO' END;
    RETURN NEXT;
    
    v_materials := v_raw_data->>'Materials';
    check_name := '2. Materials';
    check_result := COALESCE(v_materials, 'NULL');
    RETURN NEXT;
    
    v_colors := v_raw_data->>'Colors';
    check_name := '3. Colors';
    check_result := COALESCE(LEFT(v_colors, 100), 'NULL');
    RETURN NEXT;
    
    check_name := '4. Tag Sustentável existe';
    IF EXISTS (SELECT 1 FROM tags WHERE slug = 'sustentavel') THEN
        check_result := 'SIM';
    ELSE
        check_result := 'NÃO - CRIAR!';
    END IF;
    RETURN NEXT;
    
    check_name := '5. Tag Feminino existe';
    IF EXISTS (SELECT 1 FROM tags WHERE slug = 'feminino') THEN
        check_result := 'SIM';
    ELSE
        check_result := 'NÃO - CRIAR!';
    END IF;
    RETURN NEXT;
    
    check_name := '6. Material é ECO?';
    IF v_materials ILIKE '%bambu%' OR v_materials ILIKE '%cortiça%' OR 
       v_materials ILIKE '%reciclado%' OR v_materials ILIKE '%rpet%' THEN
        check_result := 'SIM - ' || v_materials;
    ELSE
        check_result := 'NÃO - ' || COALESCE(v_materials, 'null');
    END IF;
    RETURN NEXT;
    
    check_name := '7. Cor é feminina?';
    IF v_colors ILIKE '%rosa%' OR v_colors ILIKE '%roxo%' OR v_colors ILIKE '%lilás%' THEN
        check_result := 'SIM - encontrada';
    ELSE
        check_result := 'NÃO - ' || COALESCE(LEFT(v_colors, 50), 'null');
    END IF;
    RETURN NEXT;
    
    RETURN;
END;
$function$
