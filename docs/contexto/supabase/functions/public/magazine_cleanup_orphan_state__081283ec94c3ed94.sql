CREATE OR REPLACE FUNCTION public.magazine_cleanup_orphan_state(_ttl_days integer DEFAULT 180)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.magazine_reader_state
  WHERE updated_at < now() - make_interval(days => _ttl_days);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$
