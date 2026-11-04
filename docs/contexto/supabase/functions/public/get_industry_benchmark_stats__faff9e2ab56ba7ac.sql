CREATE OR REPLACE FUNCTION public.get_industry_benchmark_stats(_company_ids uuid[], _days integer DEFAULT 180)
 RETURNS TABLE(total_clients_sampled integer, avg_ltv numeric, avg_ticket numeric, avg_quotes_per_client numeric, avg_items_per_quote numeric, top_product_name text, total_revenue numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_top_product_name text;
BEGIN
  -- Top produto pré-calculado (subquery isolada)
  SELECT qi.product_name INTO v_top_product_name
  FROM public.quote_items qi
  JOIN public.quotes q ON q.id = qi.quote_id
  WHERE q.client_id = ANY(_company_ids)
    AND q.status IS DISTINCT FROM 'cancelled'
    AND q.created_at >= now() - make_interval(days => _days)
  GROUP BY qi.product_name
  ORDER BY SUM(qi.quantity) DESC
  LIMIT 1;

  RETURN QUERY
  WITH quote_stats AS (
    SELECT 
      q.client_id,
      COUNT(*)::integer            AS quotes_count,
      COALESCE(AVG(q.total), 0)    AS avg_total,
      COALESCE(SUM(q.total), 0)    AS client_revenue
    FROM public.quotes q
    WHERE q.client_id = ANY(_company_ids)
      AND q.status IS DISTINCT FROM 'cancelled'
      AND q.status IS DISTINCT FROM 'draft'
      AND q.created_at >= now() - make_interval(days => _days)
    GROUP BY q.client_id
  ),
  items_stats AS (
    SELECT 
      q.client_id,
      AVG(item_count.cnt) AS avg_items
    FROM public.quotes q
    JOIN LATERAL (
      SELECT COUNT(*)::numeric AS cnt 
      FROM public.quote_items qi 
      WHERE qi.quote_id = q.id
    ) item_count ON true
    WHERE q.client_id = ANY(_company_ids)
      AND q.created_at >= now() - make_interval(days => _days)
    GROUP BY q.client_id
  )
  SELECT 
    COUNT(DISTINCT qs.client_id)::integer       AS total_clients_sampled,
    COALESCE(AVG(qs.client_revenue), 0)::numeric AS avg_ltv,
    COALESCE(AVG(qs.avg_total), 0)::numeric      AS avg_ticket,
    COALESCE(AVG(qs.quotes_count), 0)::numeric   AS avg_quotes_per_client,
    COALESCE(AVG(its.avg_items), 0)::numeric     AS avg_items_per_quote,
    v_top_product_name                           AS top_product_name,
    COALESCE(SUM(qs.client_revenue), 0)::numeric AS total_revenue
  FROM quote_stats qs
  LEFT JOIN items_stats its ON its.client_id = qs.client_id;
END $function$
