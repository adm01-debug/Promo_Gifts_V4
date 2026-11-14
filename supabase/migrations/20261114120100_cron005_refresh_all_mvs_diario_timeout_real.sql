-- Rollback: supabase/rollbacks/20261114120100_rollback.sql
-- CRON-005: refresh-all-materialized-views morre em 120 s (statement_timeout do servidor) em 100% das execuções
-- porque o SET LOCAL de fn_cron_safe_run (20261022193000_incidente_2026_10_22_alivio_carga_cron.sql:83) não
-- rearma o timeout do statement em curso. O SET de sessão ANTES do SELECT (mensagem simple-query multi-statement;
-- PG>=13 arma o timeout por statement; pg_cron com use_background_workers=off usa libpq) dá 600 s reais.
-- Roda 1x/dia às 09:38 UTC (06:38 BRT): depois da janela noturna de scrapers (01–08 UTC, CRON-003) e antes do expediente.
-- Idempotente: resolve jobid por jobname; já no alvo → NOTICE.
DO $$
DECLARE
  v_jobid bigint; v_schedule text; v_command text;
  c_from_schedule constant text := '38 */2 * * *';
  c_to_schedule   constant text := '38 9 * * *';
  c_to_command    constant text := $cmd$SET statement_timeout = '600s'; SELECT public.fn_cron_safe_run(47::bigint, 'SELECT public.refresh_all_materialized_views();', 600000, 'refresh-all-mvs');$cmd$;
BEGIN
  SELECT jobid, schedule, command INTO v_jobid, v_schedule, v_command FROM cron.job WHERE jobname = 'refresh-all-materialized-views';
  IF v_jobid IS NULL THEN RAISE NOTICE 'CRON-005: job refresh-all-materialized-views não existe; pulando'; RETURN; END IF;
  IF v_schedule = c_to_schedule AND v_command = c_to_command THEN RAISE NOTICE 'CRON-005: já aplicado; pulando'; RETURN; END IF;
  IF v_schedule <> c_from_schedule THEN RAISE NOTICE 'CRON-005: schedule atual % (esperado %); aplicando mesmo assim', v_schedule, c_from_schedule; END IF;
  PERFORM cron.alter_job(v_jobid, schedule => c_to_schedule, command => c_to_command);
END $$;
