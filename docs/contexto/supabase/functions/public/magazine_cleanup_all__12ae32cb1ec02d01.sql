CREATE OR REPLACE FUNCTION public.magazine_cleanup_all()
 RETURNS TABLE(step text, affected_rows integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY SELECT 'orphan_reader_state'::TEXT, public.magazine_cleanup_orphan_state(180);
  RETURN QUERY SELECT 'view_events_cleanup'::TEXT, public.magazine_cleanup_view_events(180);
  RETURN QUERY SELECT 'auto_archive_drafts'::TEXT, public.magazine_auto_archive_stale_drafts(365);
  RETURN QUERY SELECT 'rollup_view_counts'::TEXT, public.magazine_rollup_view_counts();
END;
$function$
