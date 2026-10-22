-- Rollback: reverte REVOKE EXECUTE em fn_detect_recurring_errors_last_hour
-- Restaura o grant PUBLIC que existia antes da migration 20261022000100.
GRANT EXECUTE ON FUNCTION public.fn_detect_recurring_errors_last_hour(integer) TO PUBLIC;
