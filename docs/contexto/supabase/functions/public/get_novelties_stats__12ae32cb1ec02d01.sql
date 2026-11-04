CREATE OR REPLACE FUNCTION public.get_novelties_stats()
 RETURNS TABLE(total_novelties bigint, active_novelties bigint, highlighted_novelties bigint, expiring_soon bigint)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT AS total_novelties,
        COUNT(*) FILTER (WHERE expires_at > NOW() AND is_active = true)::BIGINT AS active_novelties,
        COUNT(*) FILTER (WHERE is_highlighted = true AND expires_at > NOW() AND is_active = true)::BIGINT AS highlighted_novelties,
        COUNT(*) FILTER (WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days' AND is_active = true)::BIGINT AS expiring_soon
    FROM public.product_novelties;
END;
$function$
