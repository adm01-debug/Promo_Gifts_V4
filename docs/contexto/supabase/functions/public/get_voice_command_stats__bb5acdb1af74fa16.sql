CREATE OR REPLACE FUNCTION public.get_voice_command_stats(_user_id uuid DEFAULT NULL::uuid, _days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'total', count(*),
    'success', count(*) FILTER (WHERE success = true),
    'failed', count(*) FILTER (WHERE success = false)
  ) FROM public.voice_command_logs
  WHERE created_at > now() - (_days || ' days')::interval
    AND (_user_id IS NULL OR user_id = _user_id)
    AND (_user_id IS NOT NULL OR user_id = auth.uid() OR public.is_admin(auth.uid()));
$function$
