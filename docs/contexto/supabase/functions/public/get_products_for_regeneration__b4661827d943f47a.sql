CREATE OR REPLACE FUNCTION public.get_products_for_regeneration(p_min_days_old integer DEFAULT 30, p_max_version integer DEFAULT 1, p_limit integer DEFAULT 50)
 RETURNS TABLE(product_id uuid, sku character varying, name text, current_version integer, days_since_generation integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
    SELECT 
        p.id AS product_id,
        p.sku,
        p.name,
        p.ai_version AS current_version,
        EXTRACT(DAY FROM NOW() - p.ai_generated_at)::INTEGER AS days_since_generation
    FROM products p
    WHERE p.ai_generated_at IS NOT NULL
      AND p.ai_version <= p_max_version
      AND p.ai_generated_at < NOW() - (p_min_days_old || ' days')::INTERVAL
    ORDER BY p.ai_generated_at ASC
    LIMIT p_limit;
$function$
