-- Espelho do ledger (reconciliação B2, 2026-10-15)
-- version=20261013171010 name=incidente20261013_fase9_deteccao_erros_recorrentes
-- Aplicada em doufsxqlfjyuvxuezpln em 2026-10-13 via MCP apply_migration (incidente 2026-10-13).
-- O arquivo existia como 20261013120500_* (timestamp diferente do ledger). Renomeado e com o
-- corpo substituído pelos statements do ledger, byte a byte: md5(array_to_string(statements, chr(10)))
-- = 3c482b22ea795a6ef1a4932676072e41. Versão comentada anterior:
--   git show 1b59d0f:supabase/migrations/20261013120500_incidente20261013_fase9_deteccao_erros_recorrentes.sql
-- Já está no ledger: NÃO reaplicar.
-- >>> statements do ledger (byte-exato) abaixo desta linha <<<
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
  'Incidente 2026-10-13 (etapa 93/94). Base de deteccao para alerta futuro: agrega erros de query_telemetry/frontend_telemetry na ultima hora por mensagem e retorna as que passam de _min_occurrences (default 100). Nao cobre postgres_logs (nao e consultavel via SQL dentro do banco -- ver query_logs via MCP/Management API). Nao implementa canal de notificacao -- apenas a funcao de deteccao, conforme escopo da etapa.';

GRANT EXECUTE ON FUNCTION public.fn_detect_recurring_errors_last_hour(integer) TO service_role;
