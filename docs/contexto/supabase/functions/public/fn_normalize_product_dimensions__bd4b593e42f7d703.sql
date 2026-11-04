CREATE OR REPLACE FUNCTION public.fn_normalize_product_dimensions(p_product_id uuid DEFAULT NULL::uuid, p_supplier_id uuid DEFAULT NULL::uuid, p_dry_run boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_updated INTEGER := 0;
    v_length_fixed INTEGER := 0;
    v_skipped INTEGER := 0;
    v_product RECORD;
BEGIN
    FOR v_product IN (
        SELECT id, sku, height_cm, width_cm, length_cm, weight_g
        FROM products
        WHERE 
            -- Filtro: produto específico OU todos de um fornecedor
            (p_product_id IS NOT NULL AND id = p_product_id)
            OR (p_supplier_id IS NOT NULL AND supplier_id = p_supplier_id)
        ORDER BY sku
    )
    LOOP
        -- REGRA 1: length_cm NULL → copiar width_cm
        IF v_product.length_cm IS NULL AND v_product.width_cm IS NOT NULL AND v_product.width_cm > 0 THEN
            IF NOT p_dry_run THEN
                UPDATE products SET
                    length_cm = width_cm,
                    updated_at = NOW()
                WHERE id = v_product.id;
            END IF;
            v_length_fixed := v_length_fixed + 1;
            v_updated := v_updated + 1;
        ELSE
            v_skipped := v_skipped + 1;
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'total_checked', v_updated + v_skipped,
        'updated', v_updated,
        'length_null_fixed', v_length_fixed,
        'skipped', v_skipped,
        'dry_run', p_dry_run
    );
END;
$function$
