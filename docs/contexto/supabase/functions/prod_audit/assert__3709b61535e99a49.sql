CREATE OR REPLACE FUNCTION prod_audit.assert(p_batch text, p_test text, p_cat text, p_sev text, p_cond boolean, p_expected text DEFAULT NULL::text, p_actual text DEFAULT NULL::text, p_details jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'prod_audit', 'public'
AS $function$
BEGIN
  INSERT INTO prod_audit.test_results(batch, test_name, category, severity, result, expected, actual, details)
  VALUES (p_batch, p_test, p_cat, p_sev, 
    CASE WHEN p_cond THEN 'pass' ELSE 'fail' END,
    p_expected, p_actual, p_details);
END $function$
