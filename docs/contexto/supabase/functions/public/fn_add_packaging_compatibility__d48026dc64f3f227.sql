CREATE OR REPLACE FUNCTION public.fn_add_packaging_compatibility(p_product_id uuid, p_packaging_id uuid, p_source character varying DEFAULT 'manual'::character varying, p_recommended boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_fit JSONB; v_id UUID;
    v_same_supplier BOOLEAN;
BEGIN
    v_fit := fn_calculate_packaging_fit(p_product_id, p_packaging_id);
    IF v_fit ? 'error' THEN RETURN jsonb_build_object('success', FALSE, 'error', v_fit->>'error'); END IF;
    IF NOT (v_fit->>'compatible')::BOOLEAN THEN 
        RETURN jsonb_build_object('success', FALSE, 'error', 'Não cabe', 'fit', v_fit); 
    END IF;
    
    SELECT (p1.supplier_id = p2.supplier_id) INTO v_same_supplier
    FROM products p1, products p2 WHERE p1.id = p_product_id AND p2.id = p_packaging_id;
    
    INSERT INTO product_packaging_compatibility (
        product_id, packaging_id, compatibility_source,
        fit_gap_height_mm, fit_gap_width_mm, fit_gap_length_mm, fit_gap_diameter_mm,
        fit_gap_min_mm, fit_gap_avg_mm, fit_rating, is_recommended, is_same_supplier
    ) VALUES (
        p_product_id, p_packaging_id, p_source,
        (v_fit->>'gap_height_mm')::DECIMAL, (v_fit->>'gap_width_mm')::DECIMAL,
        (v_fit->>'gap_length_mm')::DECIMAL, (v_fit->>'gap_diameter_mm')::DECIMAL,
        (v_fit->>'gap_min_mm')::DECIMAL, (v_fit->>'gap_avg_mm')::DECIMAL,
        v_fit->>'fit_rating', p_recommended, COALESCE(v_same_supplier, FALSE)
    )
    ON CONFLICT (product_id, packaging_id) DO UPDATE SET
        fit_gap_min_mm = EXCLUDED.fit_gap_min_mm,
        fit_rating = EXCLUDED.fit_rating,
        updated_at = NOW()
    RETURNING id INTO v_id;
    
    RETURN jsonb_build_object('success', TRUE, 'id', v_id, 'fit', v_fit);
END;
$function$
