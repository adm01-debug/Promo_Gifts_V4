-- Adicionar WITH CHECK em INSERT (defesa em profundidade contra cross-org)
-- Atualmente INSERT sem qual permite criar quote/order com organization_id de outra org

-- ─── quotes ───
DROP POLICY IF EXISTS org_members_create_quotes ON public.quotes;
CREATE POLICY org_members_create_quotes ON public.quotes 
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_org_member(organization_id));

-- ─── orders ───
DROP POLICY IF EXISTS orders_insert ON public.orders;
CREATE POLICY orders_insert ON public.orders 
  FOR INSERT TO authenticated
  WITH CHECK (public.user_is_org_member(organization_id));

-- ─── quote_items ───
DROP POLICY IF EXISTS quote_items_insert ON public.quote_items;
CREATE POLICY quote_items_insert ON public.quote_items 
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_items.quote_id 
        AND public.user_is_org_member(q.organization_id)
    )
  );

-- ─── order_items ───
DROP POLICY IF EXISTS order_items_insert ON public.order_items;
CREATE POLICY order_items_insert ON public.order_items 
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id 
        AND public.user_is_org_member(o.organization_id)
    )
  );

COMMENT ON POLICY org_members_create_quotes ON public.quotes IS
  'Hardening Etapa 10: INSERT exige user_is_org_member(organization_id). Bloqueia cross-org leak.';
COMMENT ON POLICY orders_insert ON public.orders IS
  'Hardening Etapa 10: INSERT exige user_is_org_member(organization_id).';
COMMENT ON POLICY quote_items_insert ON public.quote_items IS
  'Hardening Etapa 10: INSERT exige membership na org da quote pai.';
COMMENT ON POLICY order_items_insert ON public.order_items IS
  'Hardening Etapa 10: INSERT exige membership na org do order pai.';
