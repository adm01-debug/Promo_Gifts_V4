-- Rollback: reverte REVOKE EXECUTE em fn_detect_recurring_errors_last_hour
-- Estado pré-migration (baseline 20261015, linhas 111299-111301):
--   PUBLIC já revogado via REVOKE ALL FROM PUBLIC;
--   authenticated e service_role com GRANT ALL.
-- NÃO conceder EXECUTE a PUBLIC — o grant PUBLIC nunca existiu nesta função.
-- Este rollback restaura o estado pré-migration sem alargar o acesso.
REVOKE EXECUTE ON FUNCTION public.fn_detect_recurring_errors_last_hour(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_detect_recurring_errors_last_hour(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_detect_recurring_errors_last_hour(integer) TO service_role;
