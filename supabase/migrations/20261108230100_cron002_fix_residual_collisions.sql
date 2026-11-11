-- Rollback: supabase/rollbacks/20261108230100_rollback.sql
-- CRON-002: reescalona 4 jobs horários para os minutos MENOS ocupados (startup timeouts
-- residuais pós-CRON-001; só o job 276 falhou nos últimos 3 dias, 2× startup timeout).
--
-- Método (2026-11-11, revisão DBA): agenda real dos 130 crons ativos no canônico
-- (cron.job WHERE active), expandida para as 24h × 60 min. Para cada job, testados todos os
-- deslocamentos que mantêm a cadência (4/h a cada 15 min, 2/h a cada 30, 1/h) e escolhido o que
-- minimiza o PICO de jobs simultâneos no mesmo minuto ao longo do dia (desempate: soma).
-- A proposta anterior (10,25,40,55 / 20,50 / 24,54 / 30) piorava :10 (4 jobs; 9 às 03:10) e
-- colocava o 114 junto do stock_daily_aggregation (22:30).
--
--   jobid 243 hash-product-images            11,26,41,56 → 9,24,39,54   pico 3 → 2
--   jobid 276 sm-site-scrape                 16,46       → 11,41        pico 3 → 2
--   jobid 224 asia-enqueue-new-products      21,51       → 25,55        pico 3 → 2
--   jobid 114 sync-supplier-timestamps-hourly 57         → 49           pico 2 → 1
--
-- Guarda: só altera se o jobid ainda for o job esperado (jobid é reatribuído se o job for recriado).
DO $$
DECLARE
  plan constant jsonb := '[
    {"id":243,"name":"hash-product-images","schedule":"9,24,39,54 * * * *"},
    {"id":276,"name":"sm-site-scrape","schedule":"11,41 * * * *"},
    {"id":224,"name":"asia-enqueue-new-products","schedule":"25,55 * * * *"},
    {"id":114,"name":"sync-supplier-timestamps-hourly","schedule":"49 * * * *"}
  ]';
  item jsonb;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(plan) LOOP
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobid = (item->>'id')::bigint AND jobname = item->>'name') THEN
      RAISE EXCEPTION 'CRON-002: jobid % não é mais %; abortando sem alterar nada', item->>'id', item->>'name';
    END IF;
  END LOOP;
  FOR item IN SELECT * FROM jsonb_array_elements(plan) LOOP
    PERFORM cron.alter_job((item->>'id')::bigint, schedule => item->>'schedule');
  END LOOP;
END $$;
