CREATE OR REPLACE FUNCTION public.fn_get_stockout_alerts(p_limit integer DEFAULT 50, p_since date DEFAULT NULL::date)
 RETURNS TABLE(product_id uuid, product_name text, product_sku text, image_url text, stock_quantity integer, supplier_id uuid, supplier_name text, last_stock_update_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.name::text, p.sku::text, p.primary_image_url::text, p.stock_quantity,
         p.supplier_id, s.name::text, p.last_stock_update_at
  FROM products p LEFT JOIN suppliers s ON s.id=p.supplier_id
  WHERE p.is_active=true AND p.is_stockout=true
    AND (p_since IS NULL OR p.last_stock_update_at >= p_since::timestamptz)
  ORDER BY p.last_stock_update_at DESC NULLS LAST, p.id
  LIMIT GREATEST(p_limit,0);
$function$
