CREATE OR REPLACE FUNCTION public.generate_variant_sku(p_product_code text, p_supplier_color_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_promo_variation_id UUID;
    v_internal_code TEXT;
    v_sku TEXT;
BEGIN
    IF p_product_code IS NULL OR TRIM(p_product_code) = '' THEN
        RETURN NULL;
    END IF;
    
    SELECT promo_variation_id INTO v_promo_variation_id
    FROM color_equivalences
    WHERE supplier_color_id = p_supplier_color_id
      AND is_active = true
    ORDER BY verified DESC, confidence_score DESC
    LIMIT 1;
    
    IF v_promo_variation_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    SELECT internal_code INTO v_internal_code
    FROM color_variations
    WHERE id = v_promo_variation_id;
    
    IF v_internal_code IS NULL THEN
        RETURN NULL;
    END IF;
    
    v_sku := TRIM(p_product_code) || '.' || v_internal_code;
    
    RETURN v_sku;
END;
$function$
