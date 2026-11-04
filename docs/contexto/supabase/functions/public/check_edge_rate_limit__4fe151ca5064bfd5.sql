CREATE OR REPLACE FUNCTION public.check_edge_rate_limit(p_key text, p_window_ms integer, p_max_requests integer)
 RETURNS TABLE(allowed boolean, remaining integer, reset_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_now TIMESTAMP WITH TIME ZONE := now();
    v_reset_at TIMESTAMP WITH TIME ZONE;
    v_count INTEGER;
BEGIN
    -- Busca ou cria o registro
    INSERT INTO public.edge_rate_limits (key, count, reset_at)
    VALUES (p_key, 1, v_now + (p_window_ms || ' milliseconds')::interval)
    ON CONFLICT (key) DO UPDATE
    SET 
        count = CASE 
            WHEN public.edge_rate_limits.reset_at < v_now THEN 1 
            ELSE public.edge_rate_limits.count + 1 
        END,
        reset_at = CASE 
            WHEN public.edge_rate_limits.reset_at < v_now THEN v_now + (p_window_ms || ' milliseconds')::interval 
            ELSE public.edge_rate_limits.reset_at 
        END,
        updated_at = v_now
    RETURNING public.edge_rate_limits.count, public.edge_rate_limits.reset_at INTO v_count, v_reset_at;

    RETURN QUERY SELECT 
        v_count <= p_max_requests,
        GREATEST(0, p_max_requests - v_count),
        v_reset_at;
END;
$function$
