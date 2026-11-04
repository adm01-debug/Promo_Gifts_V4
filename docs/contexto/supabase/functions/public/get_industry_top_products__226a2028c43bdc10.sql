CREATE OR REPLACE FUNCTION public.get_industry_top_products(_company_ids uuid[], _days integer DEFAULT 90, _limit integer DEFAULT 10)
 RETURNS TABLE(product_id uuid, product_name text, product_image_url text, total_quantity bigint, unique_clients bigint, unique_sellers bigint, total_revenue numeric, avg_unit_price numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT 
    oi.product_id,
    oi.product_name,
    oi.product_image_url,
    SUM(oi.quantity)::bigint                                AS total_quantity,
    COUNT(DISTINCT o.client_id)::bigint                     AS unique_clients,
    COUNT(DISTINCT o.seller_id)::bigint                     AS unique_sellers,
    COALESCE(SUM(oi.quantity * oi.unit_price), 0)::numeric  AS total_revenue,
    COALESCE(AVG(oi.unit_price), 0)::numeric                AS avg_unit_price
  FROM public.orders o
  JOIN public.order_items oi ON oi.order_id = o.id
  WHERE o.client_id = ANY(_company_ids)
    AND o.status IS DISTINCT FROM 'cancelled'
    AND o.status IS DISTINCT FROM 'draft'
    AND o.created_at >= now() - make_interval(days => _days)
  GROUP BY oi.product_id, oi.product_name, oi.product_image_url
  ORDER BY SUM(oi.quantity) DESC
  LIMIT _limit
$function$
