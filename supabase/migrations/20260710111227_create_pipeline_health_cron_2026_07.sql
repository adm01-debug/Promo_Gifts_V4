
-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION: create_pipeline_health_cron_2026_07
--
-- Tabela de log + cron job que roda fn_pipeline_health_monitor()
-- a cada 4 horas. Registra resultados e pode alertar via trigger.
-- ═══════════════════════════════════════════════════════════════════

-- Tabela de log de saúde do pipeline
CREATE TABLE IF NOT EXISTS public.pipeline_health_log (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  checked_at    timestamptz DEFAULT NOW() NOT NULL,
  critical_count bigint NOT NULL DEFAULT 0,
  warning_count  bigint NOT NULL DEFAULT 0,
  ok_count       bigint NOT NULL DEFAULT 0,
  results        jsonb NOT NULL DEFAULT '[]'::jsonb
);

-- Habilitar RLS
ALTER TABLE public.pipeline_health_log ENABLE ROW LEVEL SECURITY;

-- Policy: apenas service_role pode escrever
CREATE POLICY "pipeline_health_log_service_only"
  ON public.pipeline_health_log FOR ALL
  USING (auth.role() = 'service_role');

-- Função que executa o monitor e registra no log
CREATE OR REPLACE FUNCTION public.fn_run_pipeline_health_check()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
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
END $$;

-- Cron job: executar a cada 4 horas
SELECT cron.schedule(
  'pipeline-health-check-4h',
  '0 */4 * * *',
  $$SELECT public.fn_run_pipeline_health_check()$$
);
;
