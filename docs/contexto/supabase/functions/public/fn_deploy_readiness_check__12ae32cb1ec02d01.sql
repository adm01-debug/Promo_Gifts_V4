CREATE OR REPLACE FUNCTION public.fn_deploy_readiness_check()
 RETURNS TABLE(check_name text, check_status text, severity text, details text, recommendation text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 'cron_jobs_healthy'::text,
    (CASE WHEN COALESCE(failures, 0) = 0 THEN '✅ OK' ELSE '❌ FAIL' END)::text,
    'critical'::text,
    ('Falhas última hora: ' || COALESCE(failures, 0)::text)::text,
    (CASE WHEN COALESCE(failures, 0) > 0 THEN 'Investigar cron.job_run_details' ELSE 'OK' END)::text
  FROM (
    SELECT COUNT(*) AS failures FROM cron.job_run_details d
    WHERE d.start_time > now() - interval '1 hour' AND d.status='failed'
  ) t;

  RETURN QUERY
  SELECT 'no_orphan_variants'::text,
    (CASE WHEN orphans = 0 THEN '✅ OK' ELSE '❌ FAIL' END)::text,
    'critical'::text,
    ('Variants órfãs: ' || orphans::text)::text,
    (CASE WHEN orphans > 0 THEN 'DELETE órfãs' ELSE 'OK' END)::text
  FROM (
    SELECT COUNT(*) AS orphans FROM product_variants pv
    WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id = pv.product_id)
  ) t;

  RETURN QUERY
  SELECT 'stock_cache_positive'::text,
    (CASE WHEN negativos = 0 THEN '✅ OK' ELSE '❌ FAIL' END)::text,
    'critical'::text,
    ('Produtos com stock negativo: ' || negativos::text)::text,
    (CASE WHEN negativos > 0 THEN 'Rodar fn_sync_product_stock_cache' ELSE 'OK' END)::text
  FROM (SELECT COUNT(*) AS negativos FROM products WHERE stock_quantity < 0) t;

  RETURN QUERY
  SELECT 'rls_coverage'::text,
    (CASE WHEN sem_rls = 0 THEN '✅ OK' ELSE '⚠️ ATENÇÃO' END)::text,
    'critical'::text,
    ('Tabelas sem RLS: ' || sem_rls::text)::text,
    (CASE WHEN sem_rls > 0 THEN 'ALTER TABLE ENABLE RLS' ELSE 'OK' END)::text
  FROM (
    SELECT COUNT(*) AS sem_rls
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
  ) t;

  RETURN QUERY
  SELECT 'users_have_profile'::text,
    (CASE WHEN orfaos = 0 THEN '✅ OK' ELSE '⚠️ ATENÇÃO' END)::text,
    'high'::text,
    ('Users sem profile: ' || orfaos::text)::text,
    (CASE WHEN orfaos > 0 THEN 'Verificar handle_new_user' ELSE 'OK' END)::text
  FROM (
    SELECT COUNT(*) AS orfaos FROM auth.users u
    WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id)
  ) t;

  RETURN QUERY
  SELECT 'seo_redirects_unique_index'::text,
    (CASE WHEN existe = 1 THEN '✅ OK' ELSE '❌ FAIL' END)::text,
    'critical'::text,
    (CASE WHEN existe = 1 THEN 'uq_seo_redirects_source_active presente'
          ELSE 'AUSENTE - trigger quebra' END)::text,
    (CASE WHEN existe = 0 
      THEN 'CREATE UNIQUE INDEX uq_seo_redirects_source_active'
      ELSE 'OK' END)::text
  FROM (
    SELECT COUNT(*) AS existe FROM pg_indexes
    WHERE indexname = 'uq_seo_redirects_source_active' AND tablename='seo_redirects'
  ) t;

  RETURN QUERY
  SELECT 'fiscal_ncm_coverage'::text,
    (CASE WHEN sem_ncm = 0 THEN '✅ OK' ELSE '❌ FAIL' END)::text,
    'critical'::text,
    ('Produtos ativos sem NCM: ' || sem_ncm::text)::text,
    (CASE WHEN sem_ncm > 0 THEN 'UPDATE ncm_code' ELSE 'OK' END)::text
  FROM (
    SELECT COUNT(*) AS sem_ncm FROM products p
    WHERE p.is_active AND (p.ncm_code IS NULL OR p.ncm_id IS NULL)
  ) t;

  RETURN QUERY
  SELECT 'health_score_min'::text,
    (CASE WHEN score::numeric >= 90 THEN '✅ OK' ELSE '⚠️ ATENÇÃO' END)::text,
    'high'::text,
    ('Score: ' || score || ' - ' || grade)::text,
    (CASE WHEN score::numeric >= 90 THEN 'OK' ELSE 'fn_calculate_health_score' END)::text
  FROM fn_calculate_health_score();

  RETURN QUERY
  SELECT 'smoke_tests_pass'::text,
    (CASE WHEN falhas = 0 THEN '✅ OK' ELSE '❌ FAIL' END)::text,
    'critical'::text,
    ('Smoke tests falhando: ' || falhas::text || '/12')::text,
    (CASE WHEN falhas > 0 THEN 'fn_run_smoke_tests' ELSE 'OK' END)::text
  FROM (
    SELECT COUNT(*) AS falhas FROM fn_run_smoke_tests() s WHERE s.result NOT LIKE '%PASS%'
  ) t;

  RETURN QUERY
  SELECT 'zero_critical_alerts'::text,
    (CASE WHEN criticos = 0 THEN '✅ OK' ELSE '❌ FAIL' END)::text,
    'critical'::text,
    ('Alertas críticos ativos: ' || criticos::text)::text,
    (CASE WHEN criticos > 0 THEN 'v_system_alerts' ELSE 'OK' END)::text
  FROM (
    SELECT COUNT(*) AS criticos FROM v_system_alerts a WHERE a.severidade = 'critical'
  ) t;

  RETURN QUERY
  SELECT 'audit_recency'::text,
    (CASE WHEN ultima IS NULL THEN '⚠️ SEM AUDIT'
         WHEN now() - ultima < interval '30 days' THEN '✅ OK'
         ELSE '⚠️ DESATUALIZADA' END)::text,
    'medium'::text,
    ('Última auditoria: ' || COALESCE(ultima::text, 'nunca'))::text,
    (CASE WHEN ultima IS NULL OR now() - ultima > interval '30 days'
      THEN 'Rodar nova bateria' ELSE 'OK' END)::text
  FROM (
    SELECT MAX(r.executed_at) AS ultima FROM prod_audit.test_results r
  ) t;
END;
$function$
