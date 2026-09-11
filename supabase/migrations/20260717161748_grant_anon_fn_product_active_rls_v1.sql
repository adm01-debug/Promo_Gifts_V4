-- fix_version: 20260717_grant_anon_fn_product_active_rls_v1
-- Anon precisa de EXECUTE em fn_product_active_for_rls para a RLS avaliá-la.
-- A função é SECURITY DEFINER: roda como owner, lê products internamente.
-- Conceder EXECUTE não expõe dados de products diretamente ao anon.
GRANT EXECUTE ON FUNCTION public.fn_product_active_for_rls(uuid) TO anon;;
