-- Rollback de 20261114120000_cron004_reduz_frequencia_jobs_ociosos: volta à agenda observada
-- em produção em 2026-11-14 (cron.job, consulta read-only). Resolve o jobid pelo jobname.
-- Não apaga dado: só cron.alter_job(schedule).
DO $$
DECLARE
  plan constant jsonb := '[
    {"name":"generate-blurhashes",            "schedule":"*/10 * * * *"},
    {"name":"hash-product-images",            "schedule":"11,26,41,56 * * * *"},
    {"name":"backfill-image-dimensions",      "schedule":"7,22,37,52 * * * *"},
    {"name":"connections-auto-test",          "schedule":"9,24,39,54 * * * *"},
    {"name":"connections-health-check",       "schedule":"4,19,34,49 * * * *"},
    {"name":"refresh-mv-supplier-reliability","schedule":"8,23,38,53 * * * *"},
    {"name":"pgrst-schema-reload",            "schedule":"7 * * * *"}
  ]';
  item jsonb;
  v_jobid bigint;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(plan) LOOP
    SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = item->>'name';
    IF v_jobid IS NULL THEN
      RAISE NOTICE 'CRON-004 rollback: job % não existe; pulando', item->>'name';
      CONTINUE;
    END IF;
    PERFORM cron.alter_job(v_jobid, schedule => item->>'schedule');
  END LOOP;
END $$;
