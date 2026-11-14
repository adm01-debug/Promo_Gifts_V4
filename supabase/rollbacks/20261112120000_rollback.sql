-- Rollback: 20261112120000_fix_fn_get_supplier_reliability
-- Remove a RPC SECURITY DEFINER (guarda supervisor+) que expoe mv_supplier_reliability.
-- Depois do rollback a aba "Confiabilidade de Fornecedores" volta a dar erro (42501/404 da RPC)
-- para supervisor+; reverter tambem o front (useSupplierReliabilityServer.ts e
-- SupplierReliabilityTab.tsx) se necessario.
-- Nao reabre SELECT na MV (mantem o hardening de 20260716191641).

DROP FUNCTION IF EXISTS public.fn_get_supplier_reliability();

NOTIFY pgrst, 'reload schema';
