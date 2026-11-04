CREATE OR REPLACE FUNCTION public.fn_anon_catalog_grant_audit_run()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v jsonb; c int;
BEGIN
  SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb), count(*) INTO v, c
  FROM public.fn_verify_anon_catalog_grants() t;
  INSERT INTO public.anon_catalog_grant_audit_log(violation_count, violations)
  VALUES (c, CASE WHEN c > 0 THEN v ELSE NULL END);
  RETURN c;
END $function$
