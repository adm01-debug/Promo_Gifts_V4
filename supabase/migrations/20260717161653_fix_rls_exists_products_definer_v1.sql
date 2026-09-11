-- ============================================================================
-- fix_version: 20260717_fix_rls_exists_products_definer_v1
-- As políticas anon em product_properties e product_tags usavam EXISTS no products.
-- Com products revogado do anon, o EXISTS falhava com 42501.
-- Solução: função helper SECURITY DEFINER que verifica atividade do produto.
-- A função roda como owner, lê products sem conceder SELECT ao anon.
-- ============================================================================

-- Helper SECURITY DEFINER para EXISTS checks em políticas RLS
CREATE OR REPLACE FUNCTION public.fn_product_active_for_rls(p_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM products
    WHERE id = p_id AND is_active = true AND is_deleted IS NOT TRUE
  );
$$;

COMMENT ON FUNCTION public.fn_product_active_for_rls(uuid) IS
  'Helper SECURITY DEFINER para políticas RLS anon (fix_version 20260717). '
  'Verifica se produto está ativo sem conceder SELECT direto em products ao anon. '
  'Usada em: product_properties_anon_read, product_tags_anon_read.';

-- Recriar as duas políticas usando a função helper
DROP POLICY IF EXISTS product_properties_anon_read ON public.product_properties;
CREATE POLICY product_properties_anon_read ON public.product_properties
  FOR SELECT TO anon
  USING (public.fn_product_active_for_rls(product_id));

DROP POLICY IF EXISTS product_tags_anon_read ON public.product_tags;
CREATE POLICY product_tags_anon_read ON public.product_tags
  FOR SELECT TO anon
  USING (public.fn_product_active_for_rls(product_id));;
