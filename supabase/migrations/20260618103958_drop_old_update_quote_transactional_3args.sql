-- Remove a assinatura antiga (3 params) para eliminar a ambiguidade.
-- A nova assinatura (4 params, 4º com DEFAULT NULL) é retrocompatível:
-- callers com 3 args continuam funcionando automaticamente.
DROP FUNCTION IF EXISTS public.update_quote_transactional(uuid, jsonb, jsonb);;
