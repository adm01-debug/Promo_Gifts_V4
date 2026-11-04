CREATE OR REPLACE FUNCTION public.fn_reprocessar_variantes_sem_cor()
 RETURNS TABLE(variantes_processadas integer, variantes_vinculadas integer, variantes_pendentes integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_total INT;
    v_vinculadas INT;
BEGIN
    -- Contar antes
    SELECT COUNT(*) INTO v_total 
    FROM product_variants WHERE color_id IS NULL;
    
    -- Reprocessar por código SPOT
    UPDATE product_variants pv
    SET 
        color_id = ce.promo_variation_id,
        color_name = cv.name,
        color_hex = cv.hex_code,
        updated_at = now()
    FROM supplier_colors sc
    JOIN color_equivalences ce ON ce.supplier_color_id = sc.id
    JOIN color_variations cv ON cv.id = ce.promo_variation_id
    WHERE pv.attributes->>'codigo_cor' = sc.code
      AND pv.color_id IS NULL;
    
    -- Reprocessar por nome
    UPDATE product_variants pv
    SET 
        color_id = cv.id,
        color_name = cv.name,
        color_hex = cv.hex_code,
        updated_at = now()
    FROM color_variations cv
    WHERE pv.color_id IS NULL
      AND pv.attributes->>'cor' IS NOT NULL
      AND (
          LOWER(TRIM(pv.attributes->>'cor')) = LOWER(TRIM(cv.name))
          OR LOWER(cv.name) LIKE LOWER(TRIM(pv.attributes->>'cor')) || '%'
      );
    
    -- Contar depois
    SELECT COUNT(*) INTO v_vinculadas 
    FROM product_variants WHERE color_id IS NOT NULL;
    
    -- Retornar estatísticas
    RETURN QUERY SELECT 
        v_total,
        v_total - (SELECT COUNT(*)::INT FROM product_variants WHERE color_id IS NULL),
        (SELECT COUNT(*)::INT FROM product_variants WHERE color_id IS NULL);
END;
$function$
