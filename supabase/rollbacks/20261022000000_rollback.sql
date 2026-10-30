-- Rollback: reverte REVOKE EXECUTE em fn_backfill_queue_reap_stuck
-- Estado pré-migration (baseline 20261015, linhas 110853-110855):
--   PUBLIC já revogado via REVOKE ALL FROM PUBLIC;
--   authenticated e service_role com GRANT ALL.
-- NÃO conceder EXECUTE a PUBLIC — o grant PUBLIC nunca existiu nesta função.
-- Este rollback restaura o estado pré-migration sem alargar o acesso.
REVOKE EXECUTE ON FUNCTION public.fn_backfill_queue_reap_stuck(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_backfill_queue_reap_stuck(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_backfill_queue_reap_stuck(integer, integer) TO service_role;
