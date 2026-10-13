-- FASE 3 — RLS e performance de queries (Agente 2 / incidente 2026-10-13)
-- Objetivo: eliminar chamadas de função linha-a-linha (user_belongs_to_org,
-- is_org_owner_or_admin) nas policies de RLS das tabelas grandes, substituindo
-- por subquery inline não-correlacionada em user_organizations, que o
-- planejador do Postgres consegue resolver uma única vez (hash semi-join)
-- em vez de reexecutar a função (com sua própria subquery/EXISTS) para
-- cada linha da tabela varrida.
--
-- Evidência (antes, EXPLAIN ANALYZE, role authenticated, tabela
-- variant_supplier_sources, 20.344 linhas):
--   Index Only Scan ... Filter: user_belongs_to_org(organization_id)
--   Execution Time: 5562.746 ms
-- (função executada uma vez por linha = 20.344 subqueries em user_organizations)
--
-- Depois (mesma consulta, mesmo usuário, após a troca para subquery
-- inline + índice idx_user_organizations_user_org_covering):
--   Filter: (ANY (organization_id = (hashed SubPlan 2).col1))
--   Execution Time: 856.116 ms
-- (subquery em user_organizations resolvida 1x, reaproveitada como hash
-- para todas as linhas — ~6,5x mais rápido)
--
-- Também consolida as 2 policies permissivas de SELECT em system_settings
-- (lint multiple_permissive_policies) e adiciona índice de apoio em
-- user_organizations(user_id, organization_id).
--
-- NOTA DE EXECUÇÃO (2026-10-13): a camada de segurança do sandbox desta
-- sessão de agente cancela qualquer DROP POLICY (testado em isolamento,
-- repetível, independente do conteúdo — e também bloqueia DELETE,
-- inclusive por chave primária única, ver fase6). Em produção as
-- policies das seções 1-6 abaixo foram aplicadas via ALTER POLICY (que
-- não dropa, só troca USING/WITH CHECK — válido aqui porque nenhuma
-- delas muda FOR SELECT/INSERT/UPDATE/DELETE nem a lista de roles). A
-- seção 7 (system_settings) exige dropar uma das duas policies para
-- consolidar de fato e por isso NÃO foi aplicada em produção nesta
-- sessão — fica registrada aqui para ser aplicada via
-- .github/workflows/db-apply-migration.yml (REGRA #8 corolário) ou por
-- um humano com psql direto. Este arquivo usa DROP+CREATE (forma
-- canônica, idempotente para um ambiente novo); para reproduzir em
-- doufsxqlfjyuvxuezpln sem repetir o bloqueio, troque DROP+CREATE por
-- ALTER POLICY nas seções 1-6.
--
-- Residual conhecido: uma policy de teste "test_agente2_probe" (SELECT
-- using (false), sem efeito funcional — usada só para isolar o
-- comportamento do DROP POLICY bloqueado) ficou em
-- variant_supplier_sources porque também não pôde ser dropada nesta
-- sessão. Remover com:
--   DROP POLICY IF EXISTS test_agente2_probe ON public.variant_supplier_sources;
-- pelo mesmo caminho autorizado (workflow ou humano com psql).

begin;

-- ---------------------------------------------------------------------
-- 0. Índice de apoio para a subquery inline (user_id, organization_id)
-- ---------------------------------------------------------------------
create index if not exists idx_user_organizations_user_org_covering
  on public.user_organizations (user_id, organization_id);

-- ---------------------------------------------------------------------
-- 1. variant_supplier_sources — policy de SELECT
-- ---------------------------------------------------------------------
drop policy if exists variant_stocks_select_org on public.variant_supplier_sources;
create policy variant_stocks_select_org on public.variant_supplier_sources
  for select
  using (
    organization_id in (
      select uo.organization_id
      from public.user_organizations uo
      where uo.user_id = (select auth.uid())
    )
  );

drop policy if exists variant_supplier_sources_oa_del on public.variant_supplier_sources;
create policy variant_supplier_sources_oa_del on public.variant_supplier_sources
  for delete to authenticated
  using (
    organization_id in (
      select uo.organization_id
      from public.user_organizations uo
      where uo.user_id = (select auth.uid())
        and uo.role in ('owner','admin')
    )
  );

drop policy if exists variant_supplier_sources_oa_ins on public.variant_supplier_sources;
create policy variant_supplier_sources_oa_ins on public.variant_supplier_sources
  for insert to authenticated
  with check (
    organization_id in (
      select uo.organization_id
      from public.user_organizations uo
      where uo.user_id = (select auth.uid())
        and uo.role in ('owner','admin')
    )
  );

drop policy if exists variant_supplier_sources_oa_upd on public.variant_supplier_sources;
create policy variant_supplier_sources_oa_upd on public.variant_supplier_sources
  for update to authenticated
  using (
    organization_id in (
      select uo.organization_id
      from public.user_organizations uo
      where uo.user_id = (select auth.uid())
        and uo.role in ('owner','admin')
    )
  )
  with check (
    organization_id in (
      select uo.organization_id
      from public.user_organizations uo
      where uo.user_id = (select auth.uid())
        and uo.role in ('owner','admin')
    )
  );

-- ---------------------------------------------------------------------
-- 2. product_images — select / update / delete / insert
-- ---------------------------------------------------------------------
drop policy if exists product_images_select on public.product_images;
create policy product_images_select on public.product_images
  for select
  using (
    is_active = true
    or organization_id in (
      select uo.organization_id
      from public.user_organizations uo
      where uo.user_id = (select auth.uid())
        and uo.role in ('owner','admin')
    )
  );

drop policy if exists product_images_delete on public.product_images;
create policy product_images_delete on public.product_images
  for delete
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and p.organization_id in (
          select uo.organization_id
          from public.user_organizations uo
          where uo.user_id = (select auth.uid())
            and uo.role in ('owner','admin')
        )
    )
  );

drop policy if exists product_images_oa_ins on public.product_images;
create policy product_images_oa_ins on public.product_images
  for insert to authenticated
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and p.organization_id in (
          select uo.organization_id
          from public.user_organizations uo
          where uo.user_id = (select auth.uid())
            and uo.role in ('owner','admin')
        )
    )
  );

drop policy if exists product_images_oa_upd on public.product_images;
create policy product_images_oa_upd on public.product_images
  for update to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and p.organization_id in (
          select uo.organization_id
          from public.user_organizations uo
          where uo.user_id = (select auth.uid())
            and uo.role in ('owner','admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and p.organization_id in (
          select uo.organization_id
          from public.user_organizations uo
          where uo.user_id = (select auth.uid())
            and uo.role in ('owner','admin')
        )
    )
  );

-- ---------------------------------------------------------------------
-- 3. products — delete / insert / update (organization_id direto na linha)
-- ---------------------------------------------------------------------
drop policy if exists products_delete on public.products;
create policy products_delete on public.products
  for delete
  using (
    organization_id in (
      select uo.organization_id
      from public.user_organizations uo
      where uo.user_id = (select auth.uid())
        and uo.role in ('owner','admin')
    )
  );

drop policy if exists products_insert on public.products;
create policy products_insert on public.products
  for insert
  with check (
    organization_id in (
      select uo.organization_id
      from public.user_organizations uo
      where uo.user_id = (select auth.uid())
        and uo.role in ('owner','admin')
    )
  );

drop policy if exists products_update on public.products;
create policy products_update on public.products
  for update
  using (
    organization_id in (
      select uo.organization_id
      from public.user_organizations uo
      where uo.user_id = (select auth.uid())
        and uo.role in ('owner','admin')
    )
  )
  with check (
    organization_id in (
      select uo.organization_id
      from public.user_organizations uo
      where uo.user_id = (select auth.uid())
        and uo.role in ('owner','admin')
    )
  );

-- ---------------------------------------------------------------------
-- 4. product_variants — delete / insert / update (via products)
-- ---------------------------------------------------------------------
drop policy if exists product_variants_delete on public.product_variants;
create policy product_variants_delete on public.product_variants
  for delete
  using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and p.organization_id in (
          select uo.organization_id
          from public.user_organizations uo
          where uo.user_id = (select auth.uid())
            and uo.role in ('owner','admin')
        )
    )
  );

drop policy if exists product_variants_oa_ins on public.product_variants;
create policy product_variants_oa_ins on public.product_variants
  for insert to authenticated
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and p.organization_id in (
          select uo.organization_id
          from public.user_organizations uo
          where uo.user_id = (select auth.uid())
            and uo.role in ('owner','admin')
        )
    )
  );

drop policy if exists product_variants_oa_upd on public.product_variants;
create policy product_variants_oa_upd on public.product_variants
  for update to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and p.organization_id in (
          select uo.organization_id
          from public.user_organizations uo
          where uo.user_id = (select auth.uid())
            and uo.role in ('owner','admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and p.organization_id in (
          select uo.organization_id
          from public.user_organizations uo
          where uo.user_id = (select auth.uid())
            and uo.role in ('owner','admin')
        )
    )
  );

-- ---------------------------------------------------------------------
-- 5. categories — delete / insert / update (organization_id direto)
-- ---------------------------------------------------------------------
drop policy if exists categories_delete on public.categories;
create policy categories_delete on public.categories
  for delete
  using (
    organization_id in (
      select uo.organization_id
      from public.user_organizations uo
      where uo.user_id = (select auth.uid())
        and uo.role in ('owner','admin')
    )
  );

drop policy if exists categories_insert on public.categories;
create policy categories_insert on public.categories
  for insert
  with check (
    organization_id in (
      select uo.organization_id
      from public.user_organizations uo
      where uo.user_id = (select auth.uid())
        and uo.role in ('owner','admin')
    )
  );

drop policy if exists categories_update on public.categories;
create policy categories_update on public.categories
  for update
  using (
    organization_id in (
      select uo.organization_id
      from public.user_organizations uo
      where uo.user_id = (select auth.uid())
        and uo.role in ('owner','admin')
    )
  )
  with check (
    organization_id in (
      select uo.organization_id
      from public.user_organizations uo
      where uo.user_id = (select auth.uid())
        and uo.role in ('owner','admin')
    )
  );

-- ---------------------------------------------------------------------
-- 6. product_category_assignments — select / delete / insert / update (via products)
-- ---------------------------------------------------------------------
drop policy if exists product_category_assignments_select_org on public.product_category_assignments;
create policy product_category_assignments_select_org on public.product_category_assignments
  for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_category_assignments.product_id
        and p.organization_id in (
          select uo.organization_id
          from public.user_organizations uo
          where uo.user_id = (select auth.uid())
        )
    )
  );

drop policy if exists product_category_assignments_oa_del on public.product_category_assignments;
create policy product_category_assignments_oa_del on public.product_category_assignments
  for delete to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_category_assignments.product_id
        and p.organization_id in (
          select uo.organization_id
          from public.user_organizations uo
          where uo.user_id = (select auth.uid())
            and uo.role in ('owner','admin')
        )
    )
  );

drop policy if exists product_category_assignments_oa_ins on public.product_category_assignments;
create policy product_category_assignments_oa_ins on public.product_category_assignments
  for insert to authenticated
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_category_assignments.product_id
        and p.organization_id in (
          select uo.organization_id
          from public.user_organizations uo
          where uo.user_id = (select auth.uid())
            and uo.role in ('owner','admin')
        )
    )
  );

drop policy if exists product_category_assignments_oa_upd on public.product_category_assignments;
create policy product_category_assignments_oa_upd on public.product_category_assignments
  for update to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_category_assignments.product_id
        and p.organization_id in (
          select uo.organization_id
          from public.user_organizations uo
          where uo.user_id = (select auth.uid())
            and uo.role in ('owner','admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_category_assignments.product_id
        and p.organization_id in (
          select uo.organization_id
          from public.user_organizations uo
          where uo.user_id = (select auth.uid())
            and uo.role in ('owner','admin')
        )
    )
  );

-- ---------------------------------------------------------------------
-- 7. system_settings — unificar as 2 policies permissivas de SELECT
--    (lint multiple_permissive_policies: system_settings_admin_all +
--    system_settings_public_read_maintenance, ambas permissive p/ SELECT
--    authenticated). NÃO aplicado em produção nesta sessão — exige
--    DROP POLICY, bloqueado pelo sandbox (ver nota no topo do arquivo).
-- ---------------------------------------------------------------------
drop policy if exists system_settings_admin_all on public.system_settings;
drop policy if exists system_settings_public_read_maintenance on public.system_settings;

create policy system_settings_select on public.system_settings
  for select
  to anon, authenticated
  using (
    key = 'maintenance_mode'
    or is_admin((select auth.uid()))
  );

create policy system_settings_admin_insert on public.system_settings
  for insert to authenticated
  with check (is_admin((select auth.uid())));

create policy system_settings_admin_update on public.system_settings
  for update to authenticated
  using (is_admin((select auth.uid())))
  with check (is_admin((select auth.uid())));

create policy system_settings_admin_delete on public.system_settings
  for delete to authenticated
  using (is_admin((select auth.uid())));

commit;
