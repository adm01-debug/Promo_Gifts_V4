CREATE OR REPLACE FUNCTION public.get_variant_with_suppliers(p_variant_id uuid)
 RETURNS TABLE(variant_id uuid, variant_sku character varying, variant_name character varying, color_name character varying, product_id uuid, product_name character varying, total_stock integer, supplier_count bigint, suppliers jsonb)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        pv.id as variant_id,
        pv.sku::VARCHAR(100) as variant_sku,
        pv.name::VARCHAR(255) as variant_name,
        pv.color_name::VARCHAR(100),
        pv.product_id,
        p.name::VARCHAR(500) as product_name,
        COALESCE(pv.stock_quantity, 0)::INTEGER as total_stock,
        COUNT(DISTINCT vss.supplier_id) as supplier_count,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'supplier_id', vss.supplier_id,
                    'supplier_name', s.name,
                    'supplier_code', s.code,
                    'supplier_sku', vss.supplier_sku,
                    'quantity', vss.quantity,
                    'reserved_quantity', vss.reserved_quantity,
                    'available_quantity', GREATEST(vss.quantity - COALESCE(vss.reserved_quantity, 0), 0),
                    'cost_price', vss.cost_price_1,
                    'min_qty', vss.min_qty_1,
                    'lead_time_days', vss.lead_time_days,
                    'is_preferred', vss.is_preferred,
                    'priority', vss.priority,
                    'last_synced_at', vss.last_synced_at,
                    'sync_status', vss.sync_status
                )
            ) FILTER (WHERE vss.id IS NOT NULL),
            '[]'::jsonb
        ) as suppliers
    FROM product_variants pv
    LEFT JOIN products p ON pv.product_id = p.id
    LEFT JOIN variant_supplier_sources vss ON pv.id = vss.variant_id AND vss.is_active = true
    LEFT JOIN suppliers s ON vss.supplier_id = s.id
    WHERE pv.id = p_variant_id
    GROUP BY pv.id, pv.sku, pv.name, pv.color_name, pv.product_id, p.name, pv.stock_quantity;
END;
$function$
