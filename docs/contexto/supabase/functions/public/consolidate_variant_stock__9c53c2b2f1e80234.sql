CREATE OR REPLACE FUNCTION public.consolidate_variant_stock(p_variant_id uuid)
 RETURNS TABLE(variant_id uuid, previous_stock integer, new_stock integer, supplier_count bigint, suppliers_detail jsonb)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_previous INTEGER;
    v_new INTEGER;
    v_supplier_count BIGINT;
    v_detail JSONB;
    v_product_id UUID;
BEGIN
    -- Obter estoque anterior e product_id
    SELECT pv.stock_quantity, pv.product_id INTO v_previous, v_product_id
    FROM product_variants pv
    WHERE pv.id = p_variant_id;
    
    -- Calcular novo estoque agregado
    SELECT 
        COALESCE(SUM(vss.quantity), 0)::INTEGER,
        COUNT(*)::BIGINT,
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'supplier_id', vss.supplier_id,
                'quantity', vss.quantity,
                'is_active', vss.is_active
            )
        ), '[]'::jsonb)
    INTO v_new, v_supplier_count, v_detail
    FROM variant_supplier_sources vss
    WHERE vss.variant_id = p_variant_id
      AND vss.is_active = true;
    
    -- Atualizar product_variants
    UPDATE product_variants pv
    SET 
        stock_quantity = v_new,
        updated_at = NOW()
    WHERE pv.id = p_variant_id;
    
    -- Também atualizar o produto pai se existir
    IF v_product_id IS NOT NULL THEN
        UPDATE products p
        SET 
            stock_quantity = (
                SELECT COALESCE(SUM(pv2.stock_quantity), 0)
                FROM product_variants pv2
                WHERE pv2.product_id = v_product_id AND pv2.is_active = true
            ),
            is_stockout = (
                SELECT COALESCE(SUM(pv2.stock_quantity), 0) = 0
                FROM product_variants pv2
                WHERE pv2.product_id = v_product_id AND pv2.is_active = true
            ),
            last_stock_update_at = NOW(),
            updated_at = NOW()
        WHERE p.id = v_product_id;
    END IF;
    
    RETURN QUERY SELECT 
        p_variant_id,
        COALESCE(v_previous, 0),
        COALESCE(v_new, 0),
        COALESCE(v_supplier_count, 0),
        COALESCE(v_detail, '[]'::jsonb);
END;
$function$
