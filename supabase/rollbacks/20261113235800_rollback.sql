-- Rollback de 20261113235800_cron003_reagendamento_noturno_fornecedores: volta à agenda observada
-- em produção em 2026-11-13 (cron.job, consulta read-only). Resolve o jobid pelo jobname.
DO $$
DECLARE
  plan constant jsonb := '[
    {"name":"xbz-site-scrape",               "schedule":"1,31 * * * *"},
    {"name":"xbz-enrich-gold-extractors",    "schedule":"26,56 * * * *"},
    {"name":"xbz-image-uploader",            "schedule":"3,13,23,33,43,53 * * * *"},
    {"name":"kit-ficha-fetch",               "schedule":"12 */3 * * *"},
    {"name":"kit-ficha-parse-site",          "schedule":"33 * * * *"},
    {"name":"sm-site-scrape",                "schedule":"16,46 * * * *"},
    {"name":"sm-site-scrape-auth",           "schedule":"19,39,59 * * * *"},
    {"name":"sm-url-discover-search",        "schedule":"5,15,25,35,45,55 * * * *"},
    {"name":"sm-url-discover-collect",       "schedule":"8,18,28,38,48,58 * * * *"},
    {"name":"sm-category-enqueue",           "schedule":"11,26,41,56 * * * *"},
    {"name":"sm-category-collect",           "schedule":"12,27,42,57 * * * *"},
    {"name":"asia-enqueue-new-products",     "schedule":"21,51 * * * *"},
    {"name":"asia-image-uploader",           "schedule":"9 * * * *"},
    {"name":"spot-relink-family-images",     "schedule":"22,52 * * * *"},
    {"name":"process-pending-products",      "schedule":"2,17,32,47 * * * *"},
    {"name":"refresh-all-materialized-views","schedule":"38 * * * *"},
    {"name":"xbz-stock-sync",                "schedule":"23,53 * * * *"},
    {"name":"spot-stock-fast-sync",          "schedule":"10,40 * * * *"},
    {"name":"sm-stock-guard",                "schedule":"6,21,36,51 * * * *"},
    {"name":"sm-variant-coherence-guard",    "schedule":"12,27,42,57 * * * *"},
    {"name":"asia-stock-sync",               "schedule":"7,22,37,52 * * * *"}
  ]';
  item jsonb;
  v_jobid bigint;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(plan) LOOP
    SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = item->>'name';
    IF v_jobid IS NULL THEN
      RAISE NOTICE 'CRON-003 rollback: job % não existe; pulando', item->>'name';
      CONTINUE;
    END IF;
    PERFORM cron.alter_job(v_jobid, schedule => item->>'schedule');
  END LOOP;
END $$;
