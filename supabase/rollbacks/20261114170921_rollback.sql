-- Rollback de 20261114170921: volta `orders_select/insert/update` e
-- `order_items_select/update` para o predicado só-org (user_is_org_member), exatamente como
-- capturado via pg_policies em produção antes desta migration (2026-11-14).
-- ATENÇÃO: isso reabre o vazamento entre vendedores da mesma org corrigido pela migration.

DROP POLICY IF EXISTS "orders_select" ON public.orders;
CREATE POLICY "orders_select" ON public.orders
FOR SELECT USING (public.user_is_org_member(organization_id));

DROP POLICY IF EXISTS "orders_insert" ON public.orders;
CREATE POLICY "orders_insert" ON public.orders
FOR INSERT TO authenticated WITH CHECK (public.user_is_org_member(organization_id));

DROP POLICY IF EXISTS "orders_update" ON public.orders;
CREATE POLICY "orders_update" ON public.orders
FOR UPDATE USING (public.user_is_org_member(organization_id))
WITH CHECK (public.user_is_org_member(organization_id));

DROP POLICY IF EXISTS "order_items_select" ON public.order_items;
CREATE POLICY "order_items_select" ON public.order_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND public.user_is_org_member(o.organization_id)
  )
);

DROP POLICY IF EXISTS "order_items_update" ON public.order_items;
CREATE POLICY "order_items_update" ON public.order_items
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND public.user_is_org_member(o.organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND public.user_is_org_member(o.organization_id)
  )
);
