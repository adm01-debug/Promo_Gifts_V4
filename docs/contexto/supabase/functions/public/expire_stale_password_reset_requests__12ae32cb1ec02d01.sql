CREATE OR REPLACE FUNCTION public.expire_stale_password_reset_requests()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  expired_count integer;
BEGIN
  UPDATE public.password_reset_requests
     SET status = 'expired',
         reviewed_at = now(),
         reviewer_notes = COALESCE(reviewer_notes, '') ||
           '[auto-expired after 7 days pending]'
   WHERE status = 'pending'
     AND requested_at < now() - INTERVAL '7 days';
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$function$
