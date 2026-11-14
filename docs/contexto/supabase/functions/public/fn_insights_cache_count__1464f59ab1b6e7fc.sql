CREATE OR REPLACE FUNCTION public.fn_insights_cache_count(p_function_name text, p_since timestamp with time zone)
 RETURNS bigint
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT COALESCE(public.can_view_telemetry((SELECT auth.uid())), false) THEN
    RAISE EXCEPTION 'fn_insights_cache_count: acesso negado'
      USING ERRCODE = '42501';
  END IF;

  RETURN (
    SELECT count(*)
    FROM public.dashboard_insights_cache c
    WHERE (p_function_name IS NULL OR c.function_name = p_function_name)
      AND c.created_at >= COALESCE(p_since, '-infinity'::timestamptz)
  );
END;
$function$
