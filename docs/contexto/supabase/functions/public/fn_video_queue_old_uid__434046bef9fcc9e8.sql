CREATE OR REPLACE FUNCTION public.fn_video_queue_old_uid(p_queue_id uuid)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT cloudflare_video_id FROM video_import_queue WHERE id = p_queue_id;
$function$
