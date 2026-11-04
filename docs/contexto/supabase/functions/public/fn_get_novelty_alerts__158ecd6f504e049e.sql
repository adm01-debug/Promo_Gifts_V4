CREATE OR REPLACE FUNCTION public.fn_get_novelty_alerts(p_limit integer DEFAULT 30, p_since date DEFAULT NULL::date)
 RETURNS TABLE(product_id uuid, product_name text, product_sku text, image_url text, stock_quantity integer, supplier_id uuid, supplier_name text, detected_at timestamp with time zone, days_remaining integer, is_highlighted boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH dedup AS (
    SELECT DISTINCT ON (pn.product_id)
           pn.product_id, p.name::text, p.sku::text, p.primary_image_url::text, p.stock_quantity,
           p.supplier_id, s.name::text, pn.detected_at,
           EXTRACT(DAY FROM (pn.expires_at - now()))::int, pn.is_highlighted
    FROM product_novelties pn
    JOIN products p ON p.id=pn.product_id
    LEFT JOIN suppliers s ON s.id=p.supplier_id
    WHERE pn.is_active=true AND (pn.expires_at IS NULL OR pn.expires_at>now())
      AND p.is_active=true AND p.is_stockout=false
      AND p.sale_price IS NOT NULL AND p.sale_price>0
      AND p.primary_image_url IS NOT NULL AND p.primary_image_url<>''
      AND (p_since IS NULL OR pn.detected_at >= p_since::timestamptz)
    ORDER BY pn.product_id, pn.detected_at DESC
  )
  SELECT * FROM dedup ORDER BY detected_at DESC, product_id
  LIMIT GREATEST(p_limit,0);
$function$
