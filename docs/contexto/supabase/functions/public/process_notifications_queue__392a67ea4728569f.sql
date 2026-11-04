CREATE OR REPLACE FUNCTION public.process_notifications_queue(p_limit integer DEFAULT 100)
 RETURNS TABLE(id uuid, user_id uuid, title text, message text, type text, category text, created_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    wn.id,
    wn.user_id,
    wn.title,
    wn.message,
    wn.type,
    wn.category,
    wn.created_at
  FROM public.workspace_notifications wn
  WHERE wn.is_read = false
  ORDER BY wn.created_at ASC
  LIMIT p_limit;
$function$
