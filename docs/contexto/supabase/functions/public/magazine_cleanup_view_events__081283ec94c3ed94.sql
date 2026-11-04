CREATE OR REPLACE FUNCTION public.magazine_cleanup_view_events(_ttl_days integer DEFAULT 180)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count integer := 0;
BEGIN
  DELETE FROM public.magazine_public_view_events   -- PAI: roteia p/ TODAS as partições
  WHERE viewed_at < now() - make_interval(days => _ttl_days);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$
