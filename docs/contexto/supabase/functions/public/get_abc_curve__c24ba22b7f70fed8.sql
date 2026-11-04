CREATE OR REPLACE FUNCTION public.get_abc_curve(p_metric character varying DEFAULT 'revenue'::character varying, p_limit integer DEFAULT 100)
 RETURNS TABLE(rank_position integer, product_id uuid, sku character varying, name character varying, metric_value numeric, percentage numeric, cumulative_percentage numeric, abc_class character, stock_quantity integer, stock_value numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
WITH product_metrics AS (
    SELECT 
        p.id AS product_id,
        p.sku,
        p.name,
        CASE p_metric
            -- Revenue: soma de quantity * unit_price dos pedidos
            WHEN 'revenue' THEN COALESCE(
                (SELECT SUM(oi.quantity * oi.unit_price) 
                 FROM order_items oi 
                 WHERE oi.product_id = p.id),
                0
            )
            -- Quantity: soma de unidades vendidas
            WHEN 'quantity' THEN COALESCE(
                (SELECT SUM(oi.quantity)::NUMERIC 
                 FROM order_items oi 
                 WHERE oi.product_id = p.id),
                0
            )
            -- Stock Value: valor em estoque
            WHEN 'stock_value' THEN COALESCE(
                (SELECT SUM(pv.stock_quantity * COALESCE(pv.price_1, 0))
                 FROM product_variants pv
                 WHERE pv.product_id = p.id),
                0
            )
            ELSE 0
        END AS metric_value,
        -- Estoque total
        COALESCE(
            (SELECT SUM(pv.stock_quantity) FROM product_variants pv WHERE pv.product_id = p.id),
            0
        )::INTEGER AS stock_quantity,
        -- Valor em estoque (usando price_1)
        COALESCE(
            (SELECT SUM(pv.stock_quantity * COALESCE(pv.price_1, 0)) 
             FROM product_variants pv WHERE pv.product_id = p.id),
            0
        ) AS stock_value
    FROM products p
    WHERE p.is_active = true AND p.deleted_at IS NULL
),
ranked_products AS (
    SELECT 
        ROW_NUMBER() OVER (ORDER BY pm.metric_value DESC)::INTEGER AS rank_position,
        pm.product_id,
        pm.sku::VARCHAR,
        pm.name::VARCHAR,
        pm.metric_value::NUMERIC,
        (pm.metric_value / NULLIF(SUM(pm.metric_value) OVER (), 0) * 100)::NUMERIC(10,2) AS percentage,
        (SUM(pm.metric_value) OVER (ORDER BY pm.metric_value DESC) / 
         NULLIF(SUM(pm.metric_value) OVER (), 0) * 100)::NUMERIC(10,2) AS cumulative_percentage,
        pm.stock_quantity,
        pm.stock_value::NUMERIC
    FROM product_metrics pm
    WHERE pm.metric_value > 0
)
SELECT 
    rp.rank_position,
    rp.product_id,
    rp.sku,
    rp.name,
    rp.metric_value,
    rp.percentage,
    rp.cumulative_percentage,
    CASE 
        WHEN rp.cumulative_percentage <= 80 THEN 'A'
        WHEN rp.cumulative_percentage <= 95 THEN 'B'
        ELSE 'C'
    END::CHAR(1) AS abc_class,
    rp.stock_quantity,
    rp.stock_value
FROM ranked_products rp
ORDER BY rp.rank_position
LIMIT p_limit;
$function$
