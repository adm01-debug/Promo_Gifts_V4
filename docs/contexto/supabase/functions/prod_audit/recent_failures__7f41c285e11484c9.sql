CREATE OR REPLACE FUNCTION prod_audit.recent_failures(p_hours integer DEFAULT 24)
 RETURNS TABLE(batch text, test_name text, severity text, actual text, occurred_at timestamp with time zone)
 LANGUAGE sql
 SET search_path TO 'prod_audit', 'public'
AS $function$
  SELECT batch, test_name, severity, actual, executed_at
  FROM prod_audit.test_results
  WHERE result = 'fail' AND executed_at > now() - (p_hours || ' hours')::interval
  ORDER BY severity, executed_at DESC;
$function$
