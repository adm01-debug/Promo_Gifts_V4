CREATE OR REPLACE FUNCTION public.get_client_top_products(_client_id uuid, _limit integer DEFAULT 15)
 RETURNS TABLE(product_id uuid, product_name text, product_image_url text, total_quantity bigint, occurrences bigint, total_revenue numeric, avg_unit_price numeric, last_quoted_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT 
    qi.product_id,
    qi.product_name,
    qi.product_image_url,
    SUM(qi.quantity)::bigint                                AS total_quantity,
    COUNT(DISTINCT q.id)::bigint                            AS occurrences,
    COALESCE(SUM(qi.quantity * qi.unit_price), 0)::numeric  AS total_revenue,
    COALESCE(AVG(qi.unit_price), 0)::numeric                AS avg_unit_price,
    MAX(q.created_at)                                       AS last_quoted_at
  FROM public.quotes q
  JOIN public.quote_items qi ON qi.quote_id = q.id
  WHERE q.client_id = _client_id
    AND q.status IS DISTINCT FROM 'cancelled'
    AND q.status IS DISTINCT FROM 'rejected'
  GROUP BY qi.product_id, qi.product_name, qi.product_image_url
  ORDER BY SUM(qi.quantity) DESC
  LIMIT _limit
$function$
