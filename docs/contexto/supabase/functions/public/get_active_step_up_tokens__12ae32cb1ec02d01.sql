CREATE OR REPLACE FUNCTION public.get_active_step_up_tokens()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'action', action, 'expires_at', expires_at)), '[]'::jsonb)
  FROM public.step_up_tokens
  WHERE user_id = auth.uid() AND consumed = false AND expires_at > now();
$function$
