CREATE OR REPLACE FUNCTION public.test_classify_batch(product_names text[])
 RETURNS TABLE(product_name text, tipo_detectado text, category_slug text, material text, confidence text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_name TEXT;
    v_result JSONB;
BEGIN
    FOREACH v_name IN ARRAY product_names LOOP
        v_result := classify_product(v_name);
        
        product_name := v_name;
        tipo_detectado := v_result->>'tipo_detectado';
        category_slug := v_result->>'category_slug';
        material := COALESCE(v_result->>'material', v_result->>'tipo');
        confidence := CASE 
            WHEN v_result->>'error' IS NOT NULL THEN 'BAIXO'
            WHEN v_result->>'warning' IS NOT NULL THEN 'MEDIO'
            WHEN v_result->>'category_slug' IS NOT NULL 
                 AND v_result->>'material' IS NOT NULL
                 AND v_result->>'material' != 'INDEFINIDO'
            THEN 'ALTO'
            WHEN v_result->>'category_slug' IS NOT NULL 
            THEN 'MEDIO'
            ELSE 'BAIXO'
        END;
        
        RETURN NEXT;
    END LOOP;
END;
$function$
