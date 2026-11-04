CREATE OR REPLACE FUNCTION prod_audit.quick_regression_check()
 RETURNS TABLE(bateria text, total_testes_anteriores integer, ultima_execucao timestamp with time zone, pass_rate_anterior text, categoria_destaque text)
 LANGUAGE sql
 SET search_path TO 'prod_audit', 'public'
AS $function$
  WITH stats AS (
    SELECT 
      batch,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE result='pass') AS passed,
      MAX(executed_at) AS last_run,
      MODE() WITHIN GROUP (ORDER BY category) AS top_category
    FROM prod_audit.test_results
    GROUP BY batch
  )
  SELECT 
    batch,
    total,
    last_run,
    ROUND(100.0 * passed / NULLIF(total,0), 1)::text || '%',
    top_category
  FROM stats
  ORDER BY batch;
$function$
