CREATE OR REPLACE FUNCTION public.confirm_notifications_dispatched(p_ids uuid[])
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.workspace_notifications
  SET is_read = true
  WHERE id = ANY(p_ids)
    AND is_read = false;
$function$
