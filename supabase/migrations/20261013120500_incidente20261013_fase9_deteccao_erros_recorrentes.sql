-- ============================================================================
-- INCIDENTE 2026-10-13 — Fase 9 (Observabilidade, governança e prevenção)
-- Ticket: incidente 2026-10-13, aprovado pelo PO neste chat (Agente 5/5).
-- Etapa 93/94: função de detecção de mensagens de erro recorrentes.
--
-- NOTA IMPORTANTE: `postgres_logs` não é uma tabela consultável via SQL
-- dentro do próprio banco — é servido pela Management API / Logs Explorer
-- do Supabase (acessível via MCP `query_logs`, janela máx. 24h por chamada;
-- ver docs/db/POLITICA_DDL.md e docs/E12_DETECTOR_DDL_OUT_OF_BAND_2026-09-16.md).
-- Não é possível criar uma função SQL dentro de `doufsxqlfjyuvxuezpln` que
-- leia esse log diretamente.
--
-- Esta função cobre o equivalente disponível dentro do banco: agrega erros
-- recorrentes registrados pela própria aplicação em `query_telemetry`
-- (severity='error', erros de query/RPC do frontend) e em
-- `frontend_telemetry` (event_type='error', erros JS/React) na última hora,
-- retornando as mensagens com mais de 100 ocorrências. Serve de base para um
-- alerta futuro (canal de notificação fora do escopo desta etapa — ver
-- CLAUDE.md REGRA #8, mudança de infraestrutura de notificação requer
-- aprovação própria do PO).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_detect_recurring_errors_last_hour(
  _min_occurrences integer DEFAULT 100
)
RETURNS TABLE (
  source text,
  message text,
  occurrences bigint,
  first_seen timestamptz,
  last_seen timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    'query_telemetry' AS source,
    coalesce(qt.error_message, qt.error_kind, 'unknown') AS message,
    count(*) AS occurrences,
    min(qt.created_at) AS first_seen,
    max(qt.created_at) AS last_seen
  FROM public.query_telemetry qt
  WHERE qt.created_at >= now() - interval '1 hour'
    AND qt.severity = 'error'
  GROUP BY coalesce(qt.error_message, qt.error_kind, 'unknown')
  HAVING count(*) > _min_occurrences

  UNION ALL

  SELECT
    'frontend_telemetry' AS source,
    coalesce(ft.metadata->>'message', ft.name, 'unknown') AS message,
    count(*) AS occurrences,
    min(ft.created_at) AS first_seen,
    max(ft.created_at) AS last_seen
  FROM public.frontend_telemetry ft
  WHERE ft.created_at >= now() - interval '1 hour'
    AND ft.event_type = 'error'
  GROUP BY coalesce(ft.metadata->>'message', ft.name, 'unknown')
  HAVING count(*) > _min_occurrences

  ORDER BY occurrences DESC;
$function$;

COMMENT ON FUNCTION public.fn_detect_recurring_errors_last_hour(integer) IS
  'Incidente 2026-10-13 (etapa 93/94). Base de detecção para alerta futuro: agrega erros de query_telemetry/frontend_telemetry na última hora por mensagem e retorna as que passam de _min_occurrences (default 100). Não cobre postgres_logs (não é consultável via SQL dentro do banco — ver query_logs via MCP/Management API). Não implementa canal de notificação — apenas a função de detecção, conforme escopo da etapa.';

-- Somente leitura para quem já pode ver telemetria/auditoria hoje.
GRANT EXECUTE ON FUNCTION public.fn_detect_recurring_errors_last_hour(integer) TO service_role;
