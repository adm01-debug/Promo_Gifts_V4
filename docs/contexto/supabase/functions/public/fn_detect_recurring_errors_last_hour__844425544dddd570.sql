CREATE OR REPLACE FUNCTION public.fn_detect_recurring_errors_last_hour(_min_occurrences integer DEFAULT 100)
 RETURNS TABLE(source text, message text, occurrences bigint, first_seen timestamp with time zone, last_seen timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
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
$function$
