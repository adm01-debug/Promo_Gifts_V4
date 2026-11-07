-- ============================================================
-- SECURITY FIX v2 (2026-11-07) — reincidência do vazamento de api_credentials
-- ============================================================
-- CAUSA RAIZ DA REINCIDÊNCIA:
--   20260611001048_security_fix_suppliers_authenticated_credential_leak.sql
--   aplicou REVOKE SELECT table-level + GRANT SELECT por coluna (sem
--   api_credentials) em public.suppliers para `authenticated`.
--   Depois, 20260717133700_fix_grants_public_views_anon_authenticated_v1.sql
--   executou `GRANT SELECT ON public.suppliers TO anon, authenticated`
--   (table-level, todas as colunas), revertendo o fix.
--   20260717151138_secure_anon_products_suppliers_definer_v1.sql revogou
--   apenas `anon` — `authenticated` continuou com SELECT em api_credentials.
--
-- EFEITO: qualquer usuário logado (vendedor, cliente B2B) lê os tokens de
--   integração dos fornecedores (XBZ, Asia, Só Marcas) via
--   supabase.from('suppliers'). Confirmado ao vivo em
--   information_schema.column_privileges: SELECT/INSERT/UPDATE/REFERENCES
--   de `authenticated` incluem api_credentials.
--
-- FIX: REVOKE SELECT table-level de `authenticated` e re-concede SELECT
--   apenas nas 41 colunas não-secretas (todas exceto api_credentials,
--   incluindo low_stock_threshold, que não existia em 2026-06-10).
--   INSERT/UPDATE/DELETE table-level são MANTIDOS: a escrita admin depende
--   deles e a RLS is_org_owner_or_admin já restringe as linhas.
--   `anon` já está revogado desde 20260717151138 — reaplicado por segurança.
--
-- IMPACTO NO FRONTEND: nenhum. Todos os consumidores de `suppliers` no repo
--   usam lista explícita de colunas sem api_credentials
--   (useSuppliersManager.ts:159-161, useSupplierNames.ts:18,
--   stockFetcher.ts:386, useSupplierTrust.ts:79, novelty-core.ts:210,
--   useNovelties.helpers.ts:204, expert-chat/index.ts:1084,1231).
--   A view v_suppliers_public (security_invoker=false) não expõe a coluna.
--
-- Rollback: supabase/rollbacks/20261107180000_rollback.sql
-- ============================================================

REVOKE SELECT ON public.suppliers FROM authenticated;
REVOKE SELECT ON public.suppliers FROM anon;

GRANT SELECT (
  id, name, code, cnpj, contact_name, email, phone, address, active, created_at,
  website, contact_person, payment_terms, delivery_time_days, minimum_order_value,
  notes, updated_at, organization_id, trading_name, api_type, api_base_url,
  min_order_value, shipping_terms, default_markup_percent, is_product_supplier,
  is_engraving_supplier, sync_enabled, sync_interval_minutes, last_full_sync_at,
  last_sync_status, last_sync_error, api_rate_limit_per_hour, priority,
  api_requests_current_hour, api_requests_reset_at, state_uf, tax_regime,
  inscricao_estadual, phone2, logo_url, low_stock_threshold
) ON public.suppliers TO authenticated;

-- Pós-condição: falha a migration se api_credentials ainda for legível.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.column_privileges
    WHERE table_schema = 'public'
      AND table_name = 'suppliers'
      AND column_name = 'api_credentials'
      AND privilege_type = 'SELECT'
      AND grantee IN ('anon', 'authenticated')
  ) THEN
    RAISE EXCEPTION 'api_credentials ainda legível por anon/authenticated após o fix';
  END IF;
END $$;