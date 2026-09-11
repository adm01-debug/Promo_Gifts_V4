-- ============================================================================
-- ANTI-REGRESSÃO (fix_version 20260717)
-- v_suppliers_public e mv_stock_velocity são views SECURITY-DEFINER POR DESIGN:
-- projetam colunas curadas sobre objetos com acesso restrito (suppliers com RLS;
-- analytics.mv_stock_velocity sem grant para roles de app). Recriar com
-- security_invoker=on QUEBRA o acesso de 'authenticated' (PostgREST 403).
-- NÃO reintroduzir security_invoker=on nestas views.
-- ============================================================================

ALTER VIEW public.v_suppliers_public SET (security_invoker = false);
ALTER VIEW public.mv_stock_velocity  SET (security_invoker = false);

-- Hardening: mv_stock_velocity expõe dados internos de operação
-- (depleção, dias-para-ruptura, current_price). Não deve ser legível por anon.
REVOKE SELECT ON public.mv_stock_velocity FROM anon;

COMMENT ON VIEW public.v_suppliers_public IS
  'Projecao publica de fornecedores (colunas nao sensiveis) sobre public.suppliers. SECURITY-DEFINER por design (base tem RLS/lockdown). NAO usar security_invoker=on. fix_version 20260717';

COMMENT ON VIEW public.mv_stock_velocity IS
  'Wrapper PostgREST de analytics.mv_stock_velocity. SECURITY-DEFINER por design; somente authenticated (dados internos de operacao). NAO usar security_invoker=on. fix_version 20260717';

NOTIFY pgrst, 'reload schema';;
