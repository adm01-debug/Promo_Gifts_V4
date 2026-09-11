
-- BUG 3 FIX: REVOKE acesso anon/PUBLIC das 4 funções novas de novelties
-- Auditoria detectou: anon pode chamar funções de modificação de dados → RISCO CRÍTICO
-- Essas funções são chamadas APENAS por pg_cron (service_role) ou triggers internos

-- 1. fn_reactivate_valid_novelties — modifica product_novelties + products
--    Tinha: {postgres=X, anon=X, authenticated=X, service_role=X}
--    Deve:  {postgres=X, service_role=X}
REVOKE EXECUTE ON FUNCTION public.fn_reactivate_valid_novelties()
  FROM PUBLIC, anon, authenticated;

-- 2. fn_expire_novelties — modifica product_novelties + products (is_active=false)
--    Tinha: {=X (PUBLIC), postgres=X, anon=X, authenticated=X, service_role=X}
--    Deve:  {postgres=X, service_role=X}
REVOKE EXECUTE ON FUNCTION public.fn_expire_novelties()
  FROM PUBLIC, anon, authenticated;

-- 3. fn_pn_sync_products_is_new — trigger SECURITY DEFINER, nunca chamada por usuário
--    Tinha: {=X (PUBLIC), ...}
--    Deve:  {postgres=X, service_role=X}
REVOKE EXECUTE ON FUNCTION public.fn_pn_sync_products_is_new()
  FROM PUBLIC, anon, authenticated;

-- 4. fn_sync_is_new_expires_at — sincroniza campo is_new_expires_at nos products
--    Tinha: {=X (PUBLIC), ...}
--    Deve:  {postgres=X, service_role=X}
REVOKE EXECUTE ON FUNCTION public.fn_sync_is_new_expires_at()
  FROM PUBLIC, anon, authenticated;

-- Guard: garantir service_role mantém acesso em todos
GRANT EXECUTE ON FUNCTION public.fn_reactivate_valid_novelties() TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_expire_novelties() TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_pn_sync_products_is_new() TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_sync_is_new_expires_at() TO service_role;
;
