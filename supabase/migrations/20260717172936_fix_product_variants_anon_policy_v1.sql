-- ============================================================================
-- fix_version: 20260717_fix_product_variants_anon_policy_v1
-- MELHORIA 1/6: Elimina exposição de 202 variantes inativas ao anon.
-- A política product_variants_public_read tinha qual=true (TO anon,authenticated).
-- Nova estratégia: separar em duas políticas escopadas por role:
--   - anon: USING (is_active=true) — só variantes ativas
--   - authenticated: mantém true — gestão interna pode ver inativas
-- As 202 variantes inativas pertencem a produtos inativos (confirmado na simulação),
-- portanto a restrição é correta e não quebra nenhum fluxo legítimo.
-- ANTI-REGRESSAO: se bot reverter para qual=true, anon volta a ver variantes inativas.
-- ============================================================================

-- (A) Re-escopar política existente para authenticated apenas
ALTER POLICY product_variants_public_read ON public.product_variants TO authenticated;

-- (B) Nova política anon com filtro is_active
DROP POLICY IF EXISTS product_variants_anon_read ON public.product_variants;
CREATE POLICY product_variants_anon_read ON public.product_variants
  FOR SELECT TO anon
  USING (is_active = true);

COMMENT ON TABLE public.product_variants IS
  'Políticas RLS: product_variants_anon_read (is_active=true) + product_variants_public_read (authenticated, true). '
  'Separação fix_version 20260717 — anon não vê variantes inativas.';;
