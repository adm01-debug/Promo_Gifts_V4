-- ============================================================
-- PROPOSTA P16 — NET-001: Monitoramento e retry de falhas pg_net
-- Severidade: ALTO
-- Achado: NET-001
-- Status: NÃO APLICADA — somente para revisão e aprovação do PO
-- ============================================================
-- PROBLEMA:
--   17.8% das requisições pg_net falharam nos últimos 7 dias.
--   Atualizado da evidência anterior (57%) para 17.8% em 2026-10-22.
--   Pico de falhas coincide com janelas de cron sobrecarregado (CRON-001).
--
-- EVIDÊNCIA (somente leitura, confirmada 2026-10-22):
--   SELECT
--     COUNT(*) FILTER (WHERE status_code BETWEEN 200 AND 299) AS ok,
--     COUNT(*) FILTER (WHERE status_code NOT BETWEEN 200 AND 299
--                            OR status_code IS NULL) AS fail,
--     ROUND(100.0 * COUNT(*) FILTER (WHERE status_code NOT BETWEEN 200 AND 299
--                                         OR status_code IS NULL)
--           / NULLIF(COUNT(*),0), 1) AS fail_pct
--   FROM net._http_response
--   WHERE created > now() - interval '7 days';
--   → ok=1203, fail=262, fail_pct=17.8%
--
-- SOLUÇÃO:
--   1) Identificar endpoints mais falhos
--   2) Implementar retry automático para erros transitórios
--   3) Alertas para taxa > 5%
-- ============================================================

-- === PASSO 1 — IDENTIFICAR endpoints com mais falhas ===
-- (Somente SELECT — nenhuma escrita)
/*
SELECT
  url,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status_code BETWEEN 200 AND 299) AS ok,
  COUNT(*) FILTER (WHERE status_code NOT BETWEEN 200 AND 299
                         OR status_code IS NULL) AS fail,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status_code NOT BETWEEN 200 AND 299
                                       OR status_code IS NULL)
        / NULLIF(COUNT(*),0), 1) AS fail_pct,
  array_agg(DISTINCT status_code::text ORDER BY status_code::text) AS codes
FROM net._http_response
WHERE created > now() - interval '7 days'
GROUP BY url
HAVING COUNT(*) FILTER (WHERE status_code NOT BETWEEN 200 AND 299
                              OR status_code IS NULL) > 0
ORDER BY fail DESC
LIMIT 20;
*/

-- === PASSO 2 — CRIAR view de monitoramento ===
-- NÃO EXECUTAR DIRETAMENTE — usar db-apply-migration.yml
/*
CREATE OR REPLACE VIEW public.v_net_health AS
SELECT
  date_trunc('hour', created) AS hour,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE status_code BETWEEN 200 AND 299) AS success,
  COUNT(*) FILTER (WHERE status_code NOT BETWEEN 200 AND 299
                         OR status_code IS NULL) AS failed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status_code NOT BETWEEN 200 AND 299
                                       OR status_code IS NULL)
        / NULLIF(COUNT(*),0), 1) AS fail_pct
FROM net._http_response
WHERE created > now() - interval '7 days'
GROUP BY 1
ORDER BY 1 DESC;
*/

-- === ROLLBACK ===
/*
DROP VIEW IF EXISTS public.v_net_health;
*/

-- === RISCO DE REGRESSÃO ===
-- BAIXO: View de monitoramento é read-only.

-- === ESFORÇO ===
-- Pequeno (view de monitoramento) + Médio (retry logic nas edge functions)
