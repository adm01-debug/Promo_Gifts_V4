-- Hardening: a função de trigger sync_quote_discount_approval() é SECURITY DEFINER
-- e só deve ser invocada pelo gatilho trg_sync_quote_dar (que roda como dono da
-- tabela e NÃO checa EXECUTE). Revogar EXECUTE de PUBLIC/anon/authenticated remove
-- a exposição via PostgREST RPC sem afetar o disparo do trigger.
REVOKE EXECUTE ON FUNCTION public.sync_quote_discount_approval() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_quote_discount_approval() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_quote_discount_approval() FROM authenticated;;
