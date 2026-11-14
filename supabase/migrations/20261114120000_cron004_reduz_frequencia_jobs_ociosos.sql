-- Rollback: supabase/rollbacks/20261114120000_rollback.sql
-- CRON-004: reduz a frequência de 7 jobs ociosos ou redundantes (648 → 97 execuções/dia).
--
-- Evidência (consultas read-only em produção, 2026-11-14; cron.job_run_details, janela de 6 h,
-- runid > 1399672: 881 execuções, 244 "job startup timeout"):
--   generate-blurhashes 36 exec/10 startup timeouts; hash-product-images 24/7; backfill-image-dimensions 24/7;
--   connections-auto-test 24/6; connections-health-check 24/7; refresh-mv-supplier-reliability 24/7
--   (média 25 s, máx. 116 s); pgrst-schema-reload 6/0.
--   Ociosidade: product_images sem content_hash/width_px pendente = 0 e as 79 sem blurhash nunca saem
--   (10 GIF que falham a cada rodada, 69 com format NULL fora de PICKUP_FORMATS);
--   external_connections vazia; mv_supplier_reliability com 3 linhas; pgrst_ddl_watch/pgrst_drop_watch
--   já notificam o PostgREST a cada DDL.
-- medallion-promote-tick NÃO entra: pipeline_run_log de 30 dias tem rajadas no teto do lote (p_batch=300 em
-- 2026-10-17/19/23/26/28, 11-07 e 11-11); 1×/h cortaria pela metade a vazão de promoção ao catálogo. Segue 6,36.
--
-- Novos horários = subconjunto exato dos minutos de hoje (não cria colisão nova).
-- Imagens a cada 2 h das 09 às 23 UTC (8×/dia), fora da janela dos scrapers (01-08 UTC, CRON-003): o lote é
-- fixo no código (blurhash 15, hash 80, dimensões 40), então 1×/dia cortaria 96-99% da vazão de import novo.
-- pgrst-schema-reload continua ATIVO (smoke test #37 em fn_run_smoke_tests exige active=true).
-- Idempotente: resolve jobid por jobname (jobid muda se o job for recriado); ausente → NOTICE;
-- já no alvo → NOTICE; schedule divergente do observado → NOTICE e aplica (rollback restaura o observado).
-- Conjunto de jobs disjunto do de 20261113235800_cron003 e do de 20261114120100_cron005.
DO $$
DECLARE
  plan constant jsonb := '[
    {"name":"generate-blurhashes",            "from":"*/10 * * * *",        "to":"40 9-23/2 * * *"},
    {"name":"hash-product-images",            "from":"11,26,41,56 * * * *", "to":"26 9-23/2 * * *"},
    {"name":"backfill-image-dimensions",      "from":"7,22,37,52 * * * *",  "to":"52 9-23/2 * * *"},
    {"name":"connections-auto-test",          "from":"9,24,39,54 * * * *",  "to":"24 * * * *"},
    {"name":"connections-health-check",       "from":"4,19,34,49 * * * *",  "to":"19 * * * *"},
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
