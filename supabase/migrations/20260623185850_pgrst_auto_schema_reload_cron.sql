
-- ============================================================
-- MELHORIA 3/7: pg_cron para auto-reload do schema PostgREST
-- PROBLEMA: Lovable bot faz commits contínuos sem NOTIFY pgrst
--           → cache fica stale → HEAD queries retornam 400
-- SOLUÇÃO: Cron a cada 15 min garante que schema seja refrescado
-- Frequência: */15 (não sobrecarrega, synca com fn_pipeline_promote_tick)
-- ============================================================

-- Criar função helper para reload (reutilizável em migrations)
CREATE OR REPLACE FUNCTION public.fn_pgrst_reload()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
END;
$$;

COMMENT ON FUNCTION public.fn_pgrst_reload() IS 
  'Força reload do schema cache do PostgREST. '
  'Usar após migrations que alteram views/tabelas/funções. '
  'Também agendado via pg_cron a cada 15 minutos (job pgrst-schema-reload).';

GRANT EXECUTE ON FUNCTION public.fn_pgrst_reload() TO authenticated;

-- Agendar cron a cada 15 minutos
SELECT cron.schedule(
  'pgrst-schema-reload',
  '*/15 * * * *',
  $$SELECT public.fn_pgrst_reload();$$
);
;
