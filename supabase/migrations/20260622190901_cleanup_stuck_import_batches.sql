
-- MELHORIA 3: Marcar 4 batches travados como timed_out
-- finished_at = momento da correção; error_log registra motivo

UPDATE public.supplier_import_batches
SET
  status      = 'timed_out',
  finished_at = now(),
  error_log   = jsonb_build_object(
    'reason',             'batch stuck in running state — corrected 2026-06-22',
    'original_started_at', started_at::text
  )
WHERE status = 'running'
  AND started_at < now() - interval '1 hour';
;
