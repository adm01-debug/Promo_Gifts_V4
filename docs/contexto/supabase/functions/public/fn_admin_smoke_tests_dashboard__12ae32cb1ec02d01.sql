CREATE OR REPLACE FUNCTION public.fn_admin_smoke_tests_dashboard()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
BEGIN
  IF NOT coalesce(public.is_admin_or_above((SELECT auth.uid())), false) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'latest', coalesce((
      SELECT jsonb_agg(
               to_jsonb(l)
               ORDER BY CASE
                          WHEN l.result LIKE '%FAIL%' THEN 0
                          WHEN l.result LIKE '%WARN%' THEN 1
                          ELSE 2
                        END,
                        l.test_name
             )
      FROM public.v_smoke_tests_latest_run AS l
    ), '[]'::jsonb),
    'trend', coalesce((
      SELECT jsonb_agg(to_jsonb(t) ORDER BY t.ran_at DESC)
      FROM public.v_smoke_tests_trend AS t
    ), '[]'::jsonb)
  );
END
$function$
