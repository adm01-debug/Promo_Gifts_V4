CREATE OR REPLACE FUNCTION public.get_step_up_audit(_user_id uuid DEFAULT NULL::uuid, _limit integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC), '[]'::jsonb) FROM (
    SELECT * FROM public.step_up_audit_log
    WHERE (_user_id IS NULL OR user_id = _user_id)
      AND (auth.uid() = COALESCE(_user_id, auth.uid()) OR public.is_supervisor_or_above(auth.uid()))
    ORDER BY created_at DESC LIMIT _limit
  ) a;
$function$
