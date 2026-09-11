
-- ============================================================
-- FIX: BUG-STATS-01 + BUG-DAR-401
-- Criado: 2026-06-18
-- Autores: Claude (Anthropic) @ auditoria pré-produção
-- ============================================================

-- ----
-- FIX 1/2: CREATE VIEW v_catalog_stats  (BUG-STATS-01)
-- ----
-- Contexto: useCatalogRealStats.ts chama /rest/v1/v_catalog_stats
-- com select=total_variants,total_suppliers. A view foi planejada em
-- 2026-06-17 (catálogo-audit) mas NUNCA foi deployada ao banco,
-- causando HTTP 404 repetido com retry 3× no startup da aplicação.
-- A view usa SECURITY INVOKER para respeitar o contexto do caller;
-- anon e authenticated têm acesso efetivo a products e product_variants.
CREATE OR REPLACE VIEW public.v_catalog_stats
WITH (security_invoker = on)
AS
SELECT
  COUNT(pv.id)::bigint                   AS total_variants,
  COUNT(DISTINCT p.supplier_id)::bigint  AS total_suppliers
FROM public.product_variants pv
JOIN public.products p ON p.id = pv.product_id
WHERE (p.is_deleted IS NOT TRUE)
  AND (p.is_active = TRUE)
  AND (pv.is_active IS NOT FALSE);

COMMENT ON VIEW public.v_catalog_stats IS
  'Contagem de variantes e fornecedores VISÍVEIS no catálogo público. '
  'Exclui produtos is_active=false, is_deleted=true e variantes is_active=false. '
  'Usada por useCatalogRealStats (src/hooks/products/useCatalogRealStats.ts). '
  'FIX: 2026-06-18 — view ausente causava 404 no startup.';

-- Grants (catalog stats é informação pública)
GRANT SELECT ON public.v_catalog_stats TO anon, authenticated;

-- ----
-- FIX 2/2: GRANT SELECT anon em discount_approval_requests  (BUG-DAR-401)
-- ----
-- Contexto: DiscountApprovalHeaderBadge e SidebarReorganized fazem HEAD
-- em discount_approval_requests para exibir badge de aprovações pendentes.
-- O request HEAD é emitido logo após o componente montar. Se a sessão do
-- Supabase JS ainda não reconectou o JWT (race condition auth), o request
-- vai como anon → 401 "permission denied" → console "Falha ao carregar
-- Buscar" e badge trava em 0 até o próximo refetchInterval (60s).
--
-- FIX: conceder SELECT anon. RLS está habilitada COM politicas APENAS para
-- {authenticated} → anon sempre enxerga 0 linhas (DENY-by-default implícito).
-- Não há regressão de segurança: o dado nunca chega ao cliente anon.
GRANT SELECT ON public.discount_approval_requests TO anon;

-- Recarregar cache do PostgREST para que a nova view seja exposta pela REST API
NOTIFY pgrst, 'reload schema';
;
