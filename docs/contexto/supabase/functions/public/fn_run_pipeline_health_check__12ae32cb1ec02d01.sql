CREATE OR REPLACE FUNCTION public.fn_run_pipeline_health_check()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_results    jsonb;
  v_critical   bigint;
  v_warning    bigint;
  v_ok         bigint;
BEGIN
  -- Coletar resultados
  SELECT
    jsonb_agg(jsonb_build_object(
      'check', check_name, 'status', status, 'value', value, 'target', target
    )),
    COUNT(*) FILTER (WHERE status='CRITICAL'),
    COUNT(*) FILTER (WHERE status='WARNING'),
    COUNT(*) FILTER (WHERE status='OK')
  INTO v_results, v_critical, v_warning, v_ok
  FROM fn_pipeline_health_monitor();

  -- Registrar no log
  INSERT INTO public.pipeline_health_log (critical_count, warning_count, ok_count, results)
  VALUES (v_critical, v_warning, v_ok, COALESCE(v_results, '[]'::jsonb));

  -- Limpar logs antigos (manter apenas 7 dias)
  DELETE FROM public.pipeline_health_log
  WHERE checked_at < NOW() - INTERVAL '7 days';
END $function$
