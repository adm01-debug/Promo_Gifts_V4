-- Incidente 2026-10-22 — saturação do banco por rotinas pg_cron
--
-- Causa raiz (medida em produção, janela 03:30–19:15 UTC de 22/10):
--   * Instância pequena (shared_buffers 640MB, max_connections 90) e
--     cron.max_running_jobs = 32.
--   * As rotinas agendadas somaram > 95.000 s de execução em ~15,7 h
--     (≈ 1,7 processos pesados rodando sem parar), sem folga para a API.
--   * ~23% das execuções falharam com "job startup timeout" e a API
--     (PostgREST) devolveu milhares de 503/504 por hora; o banco reiniciou
--     às 13:03 UTC e as conexões administrativas expiravam.
--   * Nenhuma migração foi aplicada em 21–22/10: o gatilho foi volume,
--     não mudança de schema.
--
-- Correção (mínima e reversível): reduzir a frequência das rotinas mais
-- caras e espalhar os minutos para não se acumularem. Nenhuma rotina é
-- removida, nenhum comando é alterado, nenhum dado é tocado.
-- Para reverter: cron.alter_job(jobid, schedule := '<anterior>') — os
-- valores anteriores estão anotados em cada linha abaixo.
--
-- Referência por jobname (não por jobid fixo), idempotente.
--
-- Rollback (restaura a frequência anterior):
--   SELECT cron.alter_job(jobid, schedule := '<anterior>') FROM cron.job WHERE jobname = '<nome>';
--   usando os valores "anterior" da tabela abaixo.
--
-- Fora do escopo (anotado, não alterado aqui): conteúdo do
-- fantasmas-deactivate-guard (3 UPDATEs com varredura completa de
-- products; regras 2 e 3 podem se contradizer para SKUs XBZ-MANUAL com
-- 'active' em locked_fields) e reposicao-backfill-hourly (10/10 falhas).

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      -- jobname                         novo schedule            -- anterior
      ('asia-image-uploader',            '9 * * * *'),            -- 9,29,49 * * * *        (média 54 s, máx 94 s)
      ('process-pending-products',       '2,17,32,47 * * * *'),   -- a cada 5 min           (média 56 s)
      ('fantasmas-deactivate-guard',     '4,34 * * * *'),         -- a cada 5 min           (média 52 s, 3 varreduras em products)
      ('sm-stock-guard',                 '3,18,33,48 * * * *'),   -- a cada 5 min           (média 50 s)
      ('sm-variant-coherence-guard',     '12,27,42,57 * * * *'),  -- a cada 5 min
      ('sync-is-stockout-universal',     '0,15,30,45 * * * *'),   -- a cada 5 min
      ('dispatcher-failure-alert',       '5,20,35,50 * * * *'),   -- a cada 5 min
      ('backfill-image-dimensions',      '7,22,37,52 * * * *'),   -- a cada 5 min
      ('hash-product-images',            '10,25,40,55 * * * *'),  -- a cada 5 min
      ('xbz-site-scrape',                '1,31 * * * *'),         -- a cada 10 min          (média 79 s)
      ('sm-site-scrape',                 '14,44 * * * *'),        -- a cada 10 min
      ('medallion-promote-tick',         '6,36 * * * *'),         -- a cada 10 min          (média 60 s)
      ('xbz-enrich-gold-extractors',     '26,56 * * * *'),        -- a cada 10 min
      ('xbz-stock-sync',                 '23,53 * * * *')         -- a cada 15 min          (média 87 s)
    ) AS t(jobname, schedule)
  LOOP
    PERFORM cron.alter_job(j.jobid, schedule := r.schedule)
    FROM cron.job j
    WHERE j.jobname = r.jobname
      AND j.schedule IS DISTINCT FROM r.schedule;
  END LOOP;
END $$;
