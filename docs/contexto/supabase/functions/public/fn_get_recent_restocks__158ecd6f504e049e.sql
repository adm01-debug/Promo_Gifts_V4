CREATE OR REPLACE FUNCTION public.fn_get_recent_restocks(p_limit integer DEFAULT 30, p_since date DEFAULT NULL::date)
 RETURNS TABLE(product_id uuid, product_name text, product_sku text, image_url text, stock_quantity integer, supplier_id uuid, supplier_name text, last_restock_date date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH cenario_a AS (
    SELECT sds.product_id, max(sds.summary_date) AS last_restock_date
    FROM stock_daily_summary sds
    WHERE COALESCE(sds.stock_open,0)=0 AND COALESCE(sds.stock_close,0)>0
      AND sds.restock_detected=true
      AND sds.summary_date >= GREATEST(
        COALESCE(p_since, (CURRENT_DATE - INTERVAL '30 days')::date),
        (CURRENT_DATE - INTERVAL '30 days')::date
      )
    GROUP BY sds.product_id
  )
  SELECT p.id, p.name::text, p.sku::text, p.primary_image_url::text, p.stock_quantity,
         p.supplier_id, s.name::text, ca.last_restock_date
  FROM cenario_a ca
  JOIN products p ON p.id=ca.product_id
  LEFT JOIN suppliers s ON s.id=p.supplier_id
  WHERE p.is_active=true AND p.stock_quantity>0
  ORDER BY ca.last_restock_date DESC, p.stock_quantity DESC, p.id
  LIMIT GREATEST(p_limit,0);
$function$
