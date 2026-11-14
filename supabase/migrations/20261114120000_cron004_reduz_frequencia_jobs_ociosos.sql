-- Rollback: supabase/rollbacks/20261114120000_rollback.sql
-- CRON-004: reduz a frequência de 8 jobs ociosos ou redundantes (696 → 100 execuções/dia).
--
-- Evidência (consultas read-only em produção, 2026-11-14; cron.job_run_details, janela de 6 h,
-- runid > 1399672: 881 execuções, 244 "job startup timeout"):
--   generate-blurhashes 36 exec/10 startup timeouts; hash-product-images 24/7; backfill-image-dimensions 24/7;
--   connections-auto-test 24/6; connections-health-check 24/7; medallion-promote-tick 12/3 (média 67 s,
--   máx. 166 s); refresh-mv-supplier-reliability 24/7 (média 25 s, máx. 116 s); pgrst-schema-reload 6/0.
--   Ociosidade: product_images sem content_hash/width_px pendente = 0 e as 79 sem blurhash nunca saem
--   (10 GIF que falham a cada rodada, 69 com format NULL fora de PICKUP_FORMATS);
--   external_connections vazia; 1 de 34 promote_tick com trabalho em 24 h; mv_supplier_reliability com
--   3 linhas; pgrst_ddl_watch/pgrst_drop_watch já notificam o PostgREST a cada DDL.
--
-- Novos horários = subconjunto exato dos minutos de hoje (não cria colisão nova).
-- pgrst-schema-reload continua ATIVO (smoke test #37 em fn_run_smoke_tests exige active=true).
-- Idempotente: resolve jobid por jobname (jobid muda se o job for recriado); ausente → NOTICE;
-- já no alvo → NOTICE; schedule divergente do observado → NOTICE e aplica (rollback restaura o observado).
-- Conjunto de jobs disjunto do de 20261113235800_cron003.
DO $$
DECLARE
  plan constant jsonb := '[
    {"name":"generate-blurhashes",            "from":"*/10 * * * *",        "to":"40 4 * * *"},
    {"name":"hash-product-images",            "from":"11,26,41,56 * * * *", "to":"26 4 * * *"},
    {"name":"backfill-image-dimensions",      "from":"7,22,37,52 * * * *",  "to":"52 4 * * *"},
    {"name":"connections-auto-test",          "from":"9,24,39,54 * * * *",  "to":"24 * * * *"},
    {"name":"connections-health-check",       "from":"4,19,34,49 * * * *",  "to":"19 * * * *"},
    {"name":"medallion-promote-tick",         "from":"6,36 * * * *",        "to":"6 * * * *"},
    {"name":"refresh-mv-supplier-reliability","from":"8,23,38,53 * * * *",  "to":"23 * * * *"},
    {"name":"pgrst-schema-reload",            "from":"7 * * * *",           "to":"7 9 * * *"}
  ]';
  item jsonb;
  v_jobid bigint;
  v_schedule text;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(plan) LOOP
    SELECT jobid, schedule INTO v_jobid, v_schedule FROM cron.job WHERE jobname = item->>'name';
    IF v_jobid IS NULL THEN
      RAISE NOTICE 'CRON-004: job % não existe; pulando', item->>'name';
      CONTINUE;
    END IF;
    IF v_schedule = item->>'to' THEN
      RAISE NOTICE 'CRON-004: job % já está em %; pulando', item->>'name', item->>'to';
      CONTINUE;
    END IF;
    IF v_schedule <> item->>'from' THEN
      RAISE NOTICE 'CRON-004: job % está em % (esperado %); aplicando % mesmo assim',
        item->>'name', v_schedule, item->>'from', item->>'to';
    END IF;
    PERFORM cron.alter_job(v_jobid, schedule => item->>'to');
  END LOOP;
END $$;
