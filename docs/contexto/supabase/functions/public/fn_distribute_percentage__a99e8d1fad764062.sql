CREATE OR REPLACE FUNCTION public.fn_distribute_percentage(p_total numeric DEFAULT 100.0, p_count integer DEFAULT 1)
 RETURNS numeric[]
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base NUMERIC;
    v_result NUMERIC[] := '{}';
    v_sum NUMERIC := 0;
    i INTEGER;
BEGIN
    IF p_count <= 0 THEN RETURN ARRAY[p_total]; END IF;
    IF p_count = 1 THEN RETURN ARRAY[p_total]; END IF;
    v_base := FLOOR(p_total / p_count * 100) / 100;
    FOR i IN 1..(p_count - 1) LOOP
        v_result := array_append(v_result, v_base);
        v_sum := v_sum + v_base;
    END LOOP;
    v_result := array_append(v_result, ROUND(p_total - v_sum, 2));
    RETURN v_result;
END;
$function$
