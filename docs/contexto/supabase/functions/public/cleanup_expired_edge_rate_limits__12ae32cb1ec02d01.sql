CREATE OR REPLACE FUNCTION public.cleanup_expired_edge_rate_limits()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    DELETE FROM public.edge_rate_limits WHERE reset_at < now();
END;
$function$
