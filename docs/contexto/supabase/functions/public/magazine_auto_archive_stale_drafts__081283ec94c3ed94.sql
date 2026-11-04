CREATE OR REPLACE FUNCTION public.magazine_auto_archive_stale_drafts(_ttl_days integer DEFAULT 365)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  archived_count INTEGER;
BEGIN
  UPDATE public.magazines
  SET status = 'archived'
  WHERE status = 'draft'
    AND updated_at < now() - make_interval(days => _ttl_days)
    AND deleted_at IS NULL;
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$function$
