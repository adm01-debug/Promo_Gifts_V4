-- ============================================================================
-- fix_version: 20260717_grant_anon_variant_sale_prices_definer_v1
-- Item 3: expõe preços escalonados (min_qty -> sale_price) ao anon no detalhe de produto.
-- A view projeta APENAS preços finais (custo x markup calculado internamente); custo e
-- markup NUNCA saem como coluna. Tornada SECURITY DEFINER (security_invoker=false) de
-- PROPOSITO: lê variant_supplier_sources/markup_configurations (SENSIVEIS) como owner,
-- mantendo essas tabelas inacessiveis ao anon via REST. NAO conceder anon nessas bases.
-- ANTI-REGRESSAO: NAO reverter para security_invoker=true (quebraria ou vazaria custo).
--   Advisor 'security_definer_view' vai sinalizar esta view: e INTENCIONAL e documentado.
-- ============================================================================
ALTER VIEW public.v_variant_sale_prices_public SET (security_invoker = false);
GRANT SELECT ON public.v_variant_sale_prices_public TO anon;

COMMENT ON VIEW public.v_variant_sale_prices_public IS
  'PUBLIC PRICE PROJECTION (SECURITY DEFINER intencional / fix_version 20260717_v1). '
  'Emite apenas preco de venda por faixa de quantidade; custo/markup usados no calculo '
  'nunca sao expostos. Roda como owner para ler variant_supplier_sources/markup_configurations '
  'sem conceder essas tabelas sensiveis ao anon. NAO alterar para security_invoker=true.';

NOTIFY pgrst, 'reload schema';;
