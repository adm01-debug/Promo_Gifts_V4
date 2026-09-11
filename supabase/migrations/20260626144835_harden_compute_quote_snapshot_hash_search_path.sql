-- Hardening (defense-in-depth): fixa search_path em compute_quote_snapshot_hash.
-- Antes: SECURITY INVOKER sem search_path. Corpo qualifica public.* e extensions.digest;
-- fixar search_path=public nao altera resolucao e fecha function_search_path_mutable.
-- fix_version: 20260626_sp_quotes
ALTER FUNCTION public.compute_quote_snapshot_hash(uuid) SET search_path = public;;
