CREATE OR REPLACE FUNCTION public.get_price_table_for_area(p_technique_code character varying, p_width numeric, p_height numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_type_name VARCHAR;
    v_table_id UUID;
BEGIN
    -- Mapear técnica para tipo de personalização
    v_type_name := CASE p_technique_code
        WHEN 'pad_printing' THEN 'Tampografia'
        WHEN 'uv_print' THEN 'UV Digital'
        WHEN 'silk_textile' THEN 'Silk screen têxtil'
        WHEN 'silk' THEN 'Silk Screen'
        WHEN 'silk_circular' THEN 'Silk Screen Circular'
        WHEN 'laser_fiber' THEN 'Laser'
        WHEN 'laser_co2' THEN 'Laser'
        WHEN 'laser_circular' THEN 'Laser circular'
        WHEN 'embroidery' THEN 'Bordado'
        WHEN 'transfer' THEN 'Transfer'
        WHEN 'dtf' THEN 'Transfer Digital'
        WHEN 'hot_stamp' THEN 'Hot stamping'
        WHEN 'doming' THEN 'Doming'
        WHEN 'uv_circular' THEN 'UV Circular (360)'
        ELSE 'UV Digital' -- fallback
    END;
    
    -- Buscar tabela compatível
    SELECT id INTO v_table_id
    FROM customization_price_tables
    WHERE customization_type_name = v_type_name
      AND is_active = true
      AND max_area_width_cm >= p_width
      AND max_area_height_cm >= p_height
    ORDER BY (max_area_width_cm * max_area_height_cm) ASC
    LIMIT 1;
    
    -- Se não encontrou, pegar a maior
    IF v_table_id IS NULL THEN
        SELECT id INTO v_table_id
        FROM customization_price_tables
        WHERE customization_type_name = v_type_name
          AND is_active = true
        ORDER BY (max_area_width_cm * max_area_height_cm) DESC
        LIMIT 1;
    END IF;
    
    RETURN v_table_id;
END;
$function$
