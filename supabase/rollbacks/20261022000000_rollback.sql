-- Rollback: reverte REVOKE EXECUTE em fn_backfill_queue_reap_stuck
-- Restaura o grant PUBLIC que existia antes da migration 20261022000000.
GRANT EXECUTE ON FUNCTION public.fn_backfill_queue_reap_stuck(integer, integer) TO PUBLIC;
