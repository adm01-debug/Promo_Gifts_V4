CREATE OR REPLACE FUNCTION public.get_ai_generation_stats()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
    SELECT jsonb_build_object(
        'total_products', (SELECT COUNT(*) FROM products),
        'with_ai_description', (SELECT COUNT(*) FROM products WHERE ai_generated_at IS NOT NULL),
        'pending_generation', (SELECT COUNT(*) FROM products WHERE ai_generated_at IS NULL),
        'percentage_complete', ROUND(
            (SELECT COUNT(*) FROM products WHERE ai_generated_at IS NOT NULL)::NUMERIC / 
            NULLIF((SELECT COUNT(*) FROM products), 0) * 100, 2
        ),
        'versions_distribution', (
            SELECT jsonb_object_agg(ai_version, count)
            FROM (
                SELECT COALESCE(ai_version, 0) AS ai_version, COUNT(*) AS count
                FROM products
                GROUP BY COALESCE(ai_version, 0)
                ORDER BY ai_version
            ) sub
        ),
        'by_category', (
            SELECT jsonb_agg(jsonb_build_object(
                'category', COALESCE(c.name, 'Sem categoria'),
                'total', sub.total,
                'with_ai', sub.with_ai,
                'pending', sub.pending
            ))
            FROM (
                SELECT 
                    p.category_id,
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE p.ai_generated_at IS NOT NULL) AS with_ai,
                    COUNT(*) FILTER (WHERE p.ai_generated_at IS NULL) AS pending
                FROM products p
                GROUP BY p.category_id
                ORDER BY COUNT(*) DESC
                LIMIT 10
            ) sub
            LEFT JOIN categories c ON sub.category_id = c.id
        ),
        'history_stats', (
            SELECT jsonb_build_object(
                'total_versions', COUNT(*),
                'total_tokens_used', SUM(total_tokens),
                'avg_generation_time_ms', ROUND(AVG(generation_time_ms))
            )
            FROM product_ai_history
        ),
        'generated_at', NOW()
    );
$function$
