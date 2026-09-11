-- Fix Gap-2a: revogar EXECUTE de process_pending_batches() do role authenticated
-- process_pending_batches() é wrapper de pipeline que chama fn_process_raw_v2(Spot,1000,true).
-- Usuários autenticados não devem disparar ciclos de importação via /rpc/.
-- fn_process_raw_v2 já tem guard is_admin_or_above() mas defense-in-depth é melhor.
-- service_role (cron + edge functions) mantém EXECUTE.
REVOKE EXECUTE ON FUNCTION public.process_pending_batches() FROM authenticated;
-- Verificação inline:
DO $$
BEGIN
  IF has_function_privilege('authenticated','public.process_pending_batches()','EXECUTE') THEN
    RAISE EXCEPTION 'REVOKE não surtiu efeito';
  END IF;
END;
$$;;
