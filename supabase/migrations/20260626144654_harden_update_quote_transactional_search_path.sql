-- Hardening (defense-in-depth): fixa search_path em update_quote_transactional.
-- Antes: SECURITY INVOKER sem search_path. Corpo qualifica TODAS as refs com public.;
-- fixar search_path=public nao altera resolucao e fecha function_search_path_mutable.
-- fix_version: 20260626_sp_quotes
ALTER FUNCTION public.update_quote_transactional(uuid, jsonb, jsonb, integer) SET search_path = public;;
