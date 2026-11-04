CREATE OR REPLACE FUNCTION public.fn_video_queue_recover_stuck()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_n int;
BEGIN
  UPDATE video_import_queue
  SET status = 'pending', started_at = NULL
  WHERE status = 'downloading'
    AND started_at < now() - interval '30 minutes';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END $function$
