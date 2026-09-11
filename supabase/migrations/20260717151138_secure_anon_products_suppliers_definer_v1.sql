-- ============================================================================
-- fix_version: 20260717_secure_anon_products_suppliers_definer_v1
-- CORREÇÃO CRÍTICA: products e suppliers tinham SELECT direto para anon,
-- expondo cost_price (R$0.19–R$826.42 reais) e api_credentials (3 fornecedores).
-- SOLUÇÃO: v_products_public e v_suppliers_public → SECURITY DEFINER (security_invoker=false).
-- As views já mascaram explicitamente: cost_price=NULL::numeric, api_credentials=ausente,
-- default_markup_percent=ausente, organization_id=NULL::uuid, created_by=NULL::uuid, etc.
-- Rodando como owner, anon só vê o output das views (colunas seguras).
-- Advisor 'security_definer_view' vai sinalizar estas views: INTENCIONAL e documentado.
-- ANTI-REGRESSAO: NAO reverter para security_invoker=true sem rever exposição de custo.
-- ============================================================================

-- (A) Converter views para SECURITY DEFINER
ALTER VIEW public.v_products_public  SET (security_invoker = false);
ALTER VIEW public.v_suppliers_public SET (security_invoker = false);

-- (B) Revogar SELECT direto nas tabelas base (anon usa SOMENTE as views)
REVOKE SELECT ON public.products  FROM anon;
REVOKE SELECT ON public.suppliers FROM anon;

-- (C) Documentar a decisão nas views
COMMENT ON VIEW public.v_products_public IS
  'PUBLIC PRODUCT PROJECTION (SECURITY DEFINER intencional / fix_version 20260717_v1). '
  'Mascara explicitamente cost_price=NULL, organization_id=NULL, created_by=NULL, etc. '
  'Roda como owner para ler products sem conceder acesso direto ao anon. '
  'NAO alterar para security_invoker=true (expoeria cost_price real ao anon via REST). '
  'Filter: is_active=true AND is_deleted IS NOT TRUE.';

COMMENT ON VIEW public.v_suppliers_public IS
  'PUBLIC SUPPLIER PROJECTION (SECURITY DEFINER intencional / fix_version 20260717_v1). '
  'Expoe apenas: id, name, code, trading_name, logo_url, website, active, flags, state_uf. '
  'Mascara: api_credentials, api_base_url, default_markup_percent, cnpj, email, phone, etc. '
  'NAO alterar para security_invoker=true (expoeria api_credentials ao anon via REST).';

NOTIFY pgrst, 'reload schema';;
