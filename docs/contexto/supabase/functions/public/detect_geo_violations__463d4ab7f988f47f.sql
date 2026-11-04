CREATE OR REPLACE FUNCTION public.detect_geo_violations(_days integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('ip', ip_address, 'count', cnt)), '[]'::jsonb) FROM (
    SELECT ip_address, count(*) AS cnt FROM public.login_attempts
    WHERE created_at > now() - (_days || ' days')::interval AND success = false
    GROUP BY ip_address HAVING count(*) > 5
  ) v;
$function$
