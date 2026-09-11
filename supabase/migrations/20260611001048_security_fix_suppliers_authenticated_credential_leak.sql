
-- ============================================================
-- SECURITY FIX round 2 (2026-06-10) — vetor authenticated
-- ============================================================
-- VULN 3 (MÉDIA-ALTA): policy suppliers_authenticated_read USING(true)
--   + GRANT SELECT table-level → QUALQUER usuário autenticado (vendedor,
--   cliente B2B, etc.) conseguia ler api_credentials das integrações
--   (token XBZ, api_key Asia, password Só Marcas) via supabase.from('suppliers').
--   Frontend nunca lê essa coluna (confirmado: rest-native.ts comenta
--   "api_credentials hidden"; só edge/service_role precisa).
-- FIX: REVOKE SELECT table-level de authenticated; GRANT SELECT apenas
--   nas 40 colunas não-secretas (exclui api_credentials). INSERT/UPDATE/
--   DELETE table-level mantidos (escrita admin via RLS is_org_owner_or_admin).
--   Front ajustado: useSuppliersManager troca select('*') por colunas
--   explícitas (commit no repo).
-- Validado em BEGIN…ROLLBACK: cnpj legível (dup-check OK), api_credentials
--   bloqueado, UPDATE admin preservado.
-- ============================================================

REVOKE SELECT ON public.suppliers FROM authenticated;
GRANT SELECT (
  id, name, code, cnpj, contact_name, email, phone, address, active, created_at,
  website, contact_person, payment_terms, delivery_time_days, minimum_order_value,
  notes, updated_at, organization_id, trading_name, api_type, api_base_url,
  min_order_value, shipping_terms, default_markup_percent, is_product_supplier,
  is_engraving_supplier, sync_enabled, sync_interval_minutes, last_full_sync_at,
  last_sync_status, last_sync_error, api_rate_limit_per_hour, priority,
  api_requests_current_hour, api_requests_reset_at, state_uf, tax_regime,
  inscricao_estadual, phone2, logo_url
) ON public.suppliers TO authenticated;
;
