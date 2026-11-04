CREATE OR REPLACE FUNCTION public.get_best_supplier_for_quantity(p_variant_id uuid, p_quantity integer, p_criteria character varying DEFAULT 'stock'::character varying)
 RETURNS TABLE(supplier_id uuid, supplier_name text, supplier_code text, supplier_sku character varying, available_quantity integer, unit_cost numeric, lead_time_days integer, can_fulfill boolean, recommendation_reason text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    WITH supplier_analysis AS (
        SELECT 
            vss.supplier_id,
            s.name::TEXT AS supplier_name,
            s.code::TEXT AS supplier_code,
            vss.supplier_sku,
            (COALESCE(vss.quantity, 0) - COALESCE(vss.reserved_quantity, 0))::INTEGER AS available_qty,
            -- Calcular preço para a quantidade solicitada
            CASE 
                WHEN p_quantity >= COALESCE(vss.min_qty_5, 2147483647) THEN vss.cost_price_5
                WHEN p_quantity >= COALESCE(vss.min_qty_4, 2147483647) THEN vss.cost_price_4
                WHEN p_quantity >= COALESCE(vss.min_qty_3, 2147483647) THEN vss.cost_price_3
                WHEN p_quantity >= COALESCE(vss.min_qty_2, 2147483647) THEN vss.cost_price_2
                WHEN p_quantity >= COALESCE(vss.min_qty_1, 1) THEN vss.cost_price_1
                ELSE vss.cost_price
            END AS calculated_cost,
            vss.lead_time_days AS lead_time,
            vss.priority,
            COALESCE(vss.is_preferred, FALSE) AS is_preferred
        FROM variant_supplier_sources vss
        INNER JOIN suppliers s ON s.id = vss.supplier_id
        WHERE vss.variant_id = p_variant_id
        AND vss.is_active = TRUE
        AND COALESCE(vss.removed_from_api, FALSE) = FALSE
    )
    SELECT 
        sa.supplier_id,
        sa.supplier_name,
        sa.supplier_code,
        sa.supplier_sku,
        sa.available_qty AS available_quantity,
        sa.calculated_cost AS unit_cost,
        sa.lead_time AS lead_time_days,
        sa.available_qty >= p_quantity AS can_fulfill,
        CASE 
            WHEN sa.available_qty >= p_quantity THEN
                CASE p_criteria
                    WHEN 'stock' THEN 'Maior estoque disponível'
                    WHEN 'cost' THEN 'Menor custo unitário'
                    WHEN 'lead_time' THEN 'Menor prazo de entrega'
                    ELSE 'Recomendado'
                END
            WHEN sa.available_qty > 0 THEN 
                'Estoque parcial: ' || sa.available_qty || ' de ' || p_quantity
            ELSE 
                'Sem estoque disponível'
        END AS recommendation_reason
    FROM supplier_analysis sa
    ORDER BY 
        -- Primeiro: pode atender a quantidade?
        CASE WHEN sa.available_qty >= p_quantity THEN 0 ELSE 1 END,
        -- Segundo: critério escolhido
        CASE p_criteria
            WHEN 'stock' THEN -sa.available_qty
            WHEN 'cost' THEN COALESCE(sa.calculated_cost, 999999)
            WHEN 'lead_time' THEN COALESCE(sa.lead_time, 999)
            ELSE -sa.available_qty
        END,
        -- Terceiro: prioridade
        sa.priority ASC;
END;
$function$
