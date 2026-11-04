CREATE OR REPLACE FUNCTION public.fn_asia_mark_upload_error(p_queue_id uuid, p_error text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.asia_image_import_queue
  SET
    status     = CASE WHEN attempts >= 3 THEN 'error' ELSE 'pending' END,
    attempts   = attempts + 1,
    last_error = p_error,
    updated_at = now()
  WHERE id = p_queue_id;
END;
$function$
