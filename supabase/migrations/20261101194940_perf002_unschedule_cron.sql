-- PERF-002: Remove cron job one-shot após execução bem-sucedida
-- Job 'perf002-drop-indexes-once' executou status=succeeded às 2026-11-01 19:49:00 UTC.
-- Os 7 índices foram removidos; função auxiliar mantida (inócua sem o cron agendado).
-- ROLLBACK: N/A — índices já removidos; re-agendar seria no-op.

SELECT cron.unschedule('perf002-drop-indexes-once');
