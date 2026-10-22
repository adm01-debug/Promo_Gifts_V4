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
-- Correção (mínima e reversível):
--   1) reduzir a frequência das rotinas mais caras e espalhar os minutos
--      para não se acumularem. Nenhuma rotina é removida, nenhum comando é
--      alterado, nenhum dado é tocado;
--   2) fn_cron_safe_run passa a emitir RAISE WARNING quando a rotina estoura
--      o tempo ou falha. Antes ela devolvia o texto e o pg_cron registrava
--      só "1 row"/succeeded — os timeouts eram invisíveis (foi o que escondeu
--      este incidente). Retorno e semântica inalterados.
-- Referência por jobname (não por jobid fixo), idempotente.
--
-- Rollback: supabase/rollbacks/20261022193000_rollback.sql (restaura schedules e função anteriores):
--   SELECT cron.alter_job(jobid, schedule := '<anterior>') FROM cron.job WHERE jobname = '<nome>';
--   usando os valores "anterior" da tabela abaixo; para (2), recriar
--   fn_cron_safe_run sem as duas linhas RAISE WARNING.
--
-- Fora do escopo (anotado, não alterado aqui): conteúdo do
-- fantasmas-deactivate-guard (3 UPDATEs com varredura completa de
-- products; regras 2 e 3 podem se contradizer para SKUs XBZ-MANUAL com
-- 'active' em locked_fields). A migration E35 (20260917080000) ficou
-- obsoleta: o predicado lento já é atendido pelo índice de expressão
-- idx_stock_snapshots_captured_at_br_date, e sua precondição (schedule
-- '5 * * * *') não bate mais com produção.

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
      ('xbz-stock-sync',                 '23,53 * * * *'),        -- a cada 15 min          (média 87 s)
      ('reposicao-backfill-hourly',      '42 */4 * * *')          -- 42 * * * *             (média 104 s, 10/10 falhas por timeout; mitigação já decidida na E35)
    ) AS t(jobname, schedule)
  LOOP
    PERFORM cron.alter_job(j.jobid, schedule := r.schedule)
    FROM cron.job j
    WHERE j.jobname = r.jobname
      AND j.schedule IS DISTINCT FROM r.schedule;
  END LOOP;
END $$;

-- (2) Observabilidade de timeouts/erros em fn_cron_safe_run.
-- Corpo idêntico ao vivo em 2026-10-22 (pg_get_functiondef), só com RAISE WARNING;
-- search_path explicita pg_catalog/pg_temp (E066) — 'public' continua resolvendo
-- os nomes não qualificados dos jobs exatamente como antes.
CREATE OR REPLACE FUNCTION public.fn_cron_safe_run(p_key bigint, p_sql text, p_timeout_ms integer DEFAULT 45000, p_job_label text DEFAULT 'cron'::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE v_start timestamptz := clock_timestamp(); v_duration_ms int;
BEGIN
  IF NOT pg_try_advisory_xact_lock(p_key) THEN
    RETURN format('[%s] SKIP: job ainda em execução (lock=%s)', p_job_label, p_key);
  END IF;
  EXECUTE format('SET LOCAL statement_timeout = %L', p_timeout_ms || 'ms');
  EXECUTE p_sql;
  v_duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_start)) * 1000;
  RETURN format('[%s] OK: %sms', p_job_label, v_duration_ms);
EXCEPTION
  WHEN query_canceled THEN
    RAISE WARNING 'fn_cron_safe_run [%] TIMEOUT após %ms (limite=%ms)', p_job_label,
      EXTRACT(EPOCH FROM (clock_timestamp() - v_start))::int * 1000, p_timeout_ms;
    RETURN format('[%s] TIMEOUT após %sms (limite=%sms)', p_job_label,
      EXTRACT(EPOCH FROM (clock_timestamp() - v_start))::int * 1000, p_timeout_ms);
  WHEN OTHERS THEN
    RAISE WARNING 'fn_cron_safe_run [%] ERRO: %', p_job_label, SQLERRM;
    RETURN format('[%s] ERRO: %s', p_job_label, SQLERRM);
END; $function$;

-- ACL inalterada — reafirma o estado vivo em 2026-10-22:
-- {postgres=X/postgres,service_role=X/postgres} (só cron/service executam).
REVOKE EXECUTE ON FUNCTION public.fn_cron_safe_run(bigint, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.fn_cron_safe_run(bigint, text, integer, text) TO service_role;
