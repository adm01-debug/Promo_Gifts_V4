-- Rollback: supabase/rollbacks/20261114170921_rollback.sql
-- P0 (auditoria QA, 3 agentes independentes, 2026-11-14): as policies vivas em produção
-- `orders_select`, `orders_insert`, `orders_update`, `order_items_select`, `order_items_update`
-- checam só `user_is_org_member(organization_id)`, sem `seller_id` — qualquer vendedor
-- autenticado da organização lê/edita pedidos, faturamento e histórico de clientes de
-- OUTROS vendedores da mesma org. Confirmado ao vivo via MCP Supabase (pg_policies, schema
-- public, projeto doufsxqlfjyuvxuezpln) em 2026-11-14.
--
-- docs/security/RLS_MATRIX.md:92-116 especifica DENY para vendedor terceiro em orders/order_items
-- (SELECT/INSERT/UPDATE), ALLOW só para seller_id = auth.uid(), supervisor na mesma org
-- (get_user_org_ids) ou can_view_all_sales(). A migration `20260426125603_b96b3daf-...sql`
-- (linhas 124-257) implementou esse escopo corretamente nas policies `orders_select_scope` /
-- `orders_update_scope` / `order_items_*_scope`. Nenhuma migration no repo cria as policies
-- `orders_select` / `orders_insert` / `orders_update` / `order_items_select` / `order_items_update`
-- hoje vivas (grep em supabase/migrations/ não acha `CREATE POLICY "orders_select"` nem
-- equivalentes) — são DDL fora do fluxo de migration (dashboard ou MCP direto), a mesma classe
-- de regressão descrita em docs/agentes/banco-migrations.md (REGRA #8), sem rastro documentado.
--
-- Esta migration reaplica, nas mesmas 5 policies vivas (sem renomear), exatamente o padrão de
-- `20260426125603` (can_view_all_sales() OR supervisor-na-org OR seller_id = auth.uid()),
-- preservando o `TO authenticated` que já existia em `orders_insert` e o `cmd`/papel das demais
-- (roles = public, conferido via pg_policies antes desta migration).
--
-- Nota (não corrigido aqui, fora de escopo — ver PR): can_view_all_sales() hoje inclui
-- 'supervisor' no bypass irrestrito (sem checar organization_id), o que sobrepõe a cláusula de
-- supervisor-na-org abaixo para esse role. É uma lacuna própria de can_view_all_sales() (afeta
-- outras tabelas também) e não foi alterada nesta migration (diff mínimo).
--
-- [AUTORIZAÇÃO BD]: aprovado pelo dono no chat desta sessão em 2026-11-14.

-- ============================================================
-- ORDERS
-- ============================================================
DROP POLICY IF EXISTS "orders_select" ON public.orders;
CREATE POLICY "orders_select" ON public.orders
FOR SELECT USING (
  public.can_view_all_sales()
  OR (public.has_role(auth.uid(), 'supervisor'::public.app_role)
      AND (organization_id IS NULL
           OR organization_id IN (SELECT public.get_user_org_ids(auth.uid()))))
  OR seller_id = auth.uid()
);

DROP POLICY IF EXISTS "orders_insert" ON public.orders;
CREATE POLICY "orders_insert" ON public.orders
FOR INSERT TO authenticated WITH CHECK (
  public.can_view_all_sales()
  OR seller_id = auth.uid()
);

DROP POLICY IF EXISTS "orders_update" ON public.orders;
CREATE POLICY "orders_update" ON public.orders
FOR UPDATE USING (
  public.can_view_all_sales()
  OR (public.has_role(auth.uid(), 'supervisor'::public.app_role)
      AND (organization_id IS NULL
           OR organization_id IN (SELECT public.get_user_org_ids(auth.uid()))))
  OR seller_id = auth.uid()
)
WITH CHECK (
  public.can_view_all_sales()
  OR (public.has_role(auth.uid(), 'supervisor'::public.app_role)
      AND (organization_id IS NULL
           OR organization_id IN (SELECT public.get_user_org_ids(auth.uid()))))
  OR seller_id = auth.uid()
);

-- ============================================================
-- ORDER_ITEMS
-- ============================================================
DROP POLICY IF EXISTS "order_items_select" ON public.order_items;
CREATE POLICY "order_items_select" ON public.order_items
FOR SELECT USING (
  public.can_view_all_sales()
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (o.seller_id = auth.uid()
           OR (public.has_role(auth.uid(), 'supervisor'::public.app_role)
               AND (o.organization_id IS NULL
                    OR o.organization_id IN (SELECT public.get_user_org_ids(auth.uid())))))
  )
);

DROP POLICY IF EXISTS "order_items_update" ON public.order_items;
CREATE POLICY "order_items_update" ON public.order_items
FOR UPDATE USING (
  public.can_view_all_sales()
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (o.seller_id = auth.uid()
           OR (public.has_role(auth.uid(), 'supervisor'::public.app_role)
               AND (o.organization_id IS NULL
                    OR o.organization_id IN (SELECT public.get_user_org_ids(auth.uid())))))
  )
)
WITH CHECK (
  public.can_view_all_sales()
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (o.seller_id = auth.uid()
           OR (public.has_role(auth.uid(), 'supervisor'::public.app_role)
               AND (o.organization_id IS NULL
                    OR o.organization_id IN (SELECT public.get_user_org_ids(auth.uid())))))
  )
);
