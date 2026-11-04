CREATE OR REPLACE FUNCTION public.fn_auto_discover_compatible_packagings(p_product_id uuid, p_min_fit_rating character varying DEFAULT 'good'::character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_count_discovered INT := 0; v_count_existing INT := 0; v_count_incompatible INT := 0;
    v_packaging RECORD; v_fit JSONB; v_valid_ratings TEXT[]; v_config_type TEXT;
BEGIN
    -- ANTI-REGRESSAO(2026-06-26 perfis_v1): inferir perfil e repassar a fn_calculate_packaging_fit;
    -- popular config_type_used + auto_discovered_at. NAO remover a inferencia nem voltar a chamar
    -- fn_calculate_packaging_fit com apenas 2 argumentos.
    v_config_type := fn_infer_packaging_config_type(p_product_id);

    IF p_min_fit_rating = 'precise' THEN v_valid_ratings := ARRAY['tight','good'];
    ELSIF p_min_fit_rating = 'tight' THEN v_valid_ratings := ARRAY['tight','good','loose'];
    ELSIF p_min_fit_rating = 'good' THEN v_valid_ratings := ARRAY['good','loose'];
    ELSIF p_min_fit_rating = 'loose' THEN v_valid_ratings := ARRAY['loose'];
    ELSE v_valid_ratings := ARRAY['good','loose']; END IF;

    IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Produto não encontrado');
    END IF;

    FOR v_packaging IN
        SELECT id, name FROM products
        WHERE product_type = 'packaging' AND is_active = TRUE AND internal_height_cm IS NOT NULL AND id <> p_product_id
    LOOP
        IF EXISTS (SELECT 1 FROM product_packaging_compatibility
                   WHERE product_id = p_product_id AND packaging_id = v_packaging.id) THEN
            v_count_existing := v_count_existing + 1; CONTINUE;
        END IF;

        v_fit := fn_calculate_packaging_fit(p_product_id, v_packaging.id, v_config_type);

        IF (v_fit->>'compatible')::BOOLEAN AND (v_fit->>'fit_rating') = ANY(v_valid_ratings) THEN
            INSERT INTO product_packaging_compatibility (
                product_id, packaging_id, compatibility_source,
                fit_gap_height_mm, fit_gap_width_mm, fit_gap_length_mm, fit_gap_diameter_mm,
                fit_gap_min_mm, fit_gap_avg_mm, fit_rating, config_type_used, auto_discovered_at
            ) VALUES (
                p_product_id, v_packaging.id, 'dimension_calculated',
                (v_fit->>'gap_height_mm')::DECIMAL, (v_fit->>'gap_width_mm')::DECIMAL,
                (v_fit->>'gap_length_mm')::DECIMAL, (v_fit->>'gap_diameter_mm')::DECIMAL,
                (v_fit->>'gap_min_mm')::DECIMAL, (v_fit->>'gap_avg_mm')::DECIMAL,
                v_fit->>'fit_rating', v_config_type, now()
            );
            v_count_discovered := v_count_discovered + 1;
        ELSE
            v_count_incompatible := v_count_incompatible + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', TRUE, 'product_id', p_product_id, 'config_type', v_config_type,
        'min_fit_rating', p_min_fit_rating, 'discovered', v_count_discovered,
        'already_existed', v_count_existing, 'incompatible', v_count_incompatible);
END;
$function$
