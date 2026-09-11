-- Hardening (defense-in-depth): fixa search_path em create_quote_transactional.
-- Antes: SECURITY INVOKER sem search_path (linter function_search_path_mutable).
-- O corpo já qualifica TODAS as refs com public.; fixar search_path=public nao altera
-- resolucao alguma e elimina o vetor de resolucao-de-objeto/regressao.
-- fix_version: 20260626_sp_quotes
ALTER FUNCTION public.create_quote_transactional(jsonb, jsonb) SET search_path = public;;
