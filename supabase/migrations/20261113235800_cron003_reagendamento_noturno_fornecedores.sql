-- Rollback: supabase/rollbacks/20261113235800_rollback.sql
-- CRON-003 (PROPOSTA — cada linha pode ser vetada pelo dono): reagenda 21 jobs pesados de
-- fornecedor/ingestão (xbz-*, sm-*, asia-*, spot-*, scrapers de ficha XBZ, process-pending-products,
-- refresh-all-materialized-views) para fora do horário comercial ou para cadência de 1–2 h.
--
-- Evidência (docs/prod-readiness.md §7.4/§7.8; cron.job_run_details, 24 h até 2026-11-13 23:5xZ):
--   137 jobs ativos, cron.max_running_jobs = 32; 487 execuções em 3 h (~2,7/min), 55 > 30 s;
--   70 falhas "job startup timeout" em 15 jobs. Os 21 jobs abaixo somam ~1.500 execuções/dia e
--   ~22.700 s de CPU/dia (process-pending-products 3.320 s, xbz-stock-sync 2.765 s,
--   refresh-all-materialized-views 2.668 s, sm-stock-guard 2.272 s, xbz-site-scrape 2.217 s, ...).
--
-- Regra: janela noturna = 01:00–08:59 UTC (22:00–05:59 BRT), mesmos minutos de hoje (subconjunto
-- da grade atual → não cria colisão nova). Cadência reduzida usa um dos minutos já em uso.
-- `cron.max_running_jobs` (GUC) não é alterável por migration (ALTER SYSTEM bloqueado pelo
-- preflight; precedente em 20261101202500_cron001_*). Só recomendação no corpo da PR.
--
-- Idempotente: resolve o jobid pelo jobname (jobid muda se o job for recriado); job ausente →
-- NOTICE e segue; schedule já no alvo → NOTICE e segue; schedule diferente do observado →
-- NOTICE (aplica mesmo assim; o rollback restaura o observado em 2026-11-13).
-- Interação: 20261108230100_cron002 (pendente) também mexe em sm-site-scrape e
-- asia-enqueue-new-products; se for aplicada DEPOIS desta, desfaz a janela noturna desses 2 jobs.
DO $$
DECLARE
  plan constant jsonb := '[
    {"name":"xbz-site-scrape",               "from":"1,31 * * * *",               "to":"1,31 1-8 * * *"},
    {"name":"xbz-enrich-gold-extractors",    "from":"26,56 * * * *",              "to":"26,56 1-8 * * *"},
    {"name":"xbz-image-uploader",            "from":"3,13,23,33,43,53 * * * *",   "to":"3,13,23,33,43,53 1-8 * * *"},
    {"name":"kit-ficha-fetch",               "from":"12 */3 * * *",               "to":"12 1,4,7 * * *"},
    {"name":"kit-ficha-parse-site",          "from":"33 * * * *",                 "to":"33 1-8 * * *"},
    {"name":"sm-site-scrape",                "from":"16,46 * * * *",              "to":"16,46 1-8 * * *"},
    {"name":"sm-site-scrape-auth",           "from":"19,39,59 * * * *",           "to":"19,39,59 1-8 * * *"},
    {"name":"sm-url-discover-search",        "from":"5,15,25,35,45,55 * * * *",   "to":"5,15,25,35,45,55 1-8 * * *"},
    {"name":"sm-url-discover-collect",       "from":"8,18,28,38,48,58 * * * *",   "to":"8,18,28,38,48,58 1-8 * * *"},
    {"name":"sm-category-enqueue",           "from":"11,26,41,56 * * * *",        "to":"11,26,41,56 1-8 * * *"},
    {"name":"sm-category-collect",           "from":"12,27,42,57 * * * *",        "to":"12,27,42,57 1-8 * * *"},
    {"name":"asia-enqueue-new-products",     "from":"21,51 * * * *",              "to":"21,51 1-8 * * *"},
    {"name":"asia-image-uploader",           "from":"9 * * * *",                  "to":"9 1-8 * * *"},
    {"name":"spot-relink-family-images",     "from":"22,52 * * * *",              "to":"22,52 1-8 * * *"},
    {"name":"process-pending-products",      "from":"2,17,32,47 * * * *",         "to":"47 * * * *"},
    {"name":"refresh-all-materialized-views","from":"38 * * * *",                 "to":"38 */2 * * *"},
    {"name":"xbz-stock-sync",                "from":"23,53 * * * *",              "to":"53 * * * *"},
    {"name":"spot-stock-fast-sync",          "from":"10,40 * * * *",              "to":"40 * * * *"},
    {"name":"sm-stock-guard",                "from":"6,21,36,51 * * * *",         "to":"51 * * * *"},
    {"name":"sm-variant-coherence-guard",    "from":"12,27,42,57 * * * *",        "to":"57 * * * *"},
    {"name":"asia-stock-sync",               "from":"7,22,37,52 * * * *",         "to":"52 * * * *"}
  ]';
  item jsonb;
  v_jobid bigint;
  v_schedule text;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(plan) LOOP
    SELECT jobid, schedule INTO v_jobid, v_schedule FROM cron.job WHERE jobname = item->>'name';
    IF v_jobid IS NULL THEN
      RAISE NOTICE 'CRON-003: job % não existe; pulando', item->>'name';
      CONTINUE;
    END IF;
    IF v_schedule = item->>'to' THEN
      RAISE NOTICE 'CRON-003: job % já está em %; pulando', item->>'name', item->>'to';
      CONTINUE;
    END IF;
    IF v_schedule <> item->>'from' THEN
      RAISE NOTICE 'CRON-003: job % está em % (esperado %); aplicando % mesmo assim',
        item->>'name', v_schedule, item->>'from', item->>'to';
    END IF;
    PERFORM cron.alter_job(v_jobid, schedule => item->>'to');
  END LOOP;
END $$;
