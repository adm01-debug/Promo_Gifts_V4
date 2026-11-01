-- Rollback: See supabase/rollbacks/20261013171953_rollback.sql
-- Espelho do ledger (reconciliação B2, 2026-10-15)
-- version=20261013171953 name=agente2_fase3_rls_alter_policies
-- Aplicada em doufsxqlfjyuvxuezpln em 2026-10-13 via MCP apply_migration (Agente 2, incidente 2026-10-13).
-- Corresponde às seções 1 (só as policies oa_*), 2, 3, 4, 5 e 6 do antigo
-- 20261013141300_fase3_rls_performance.sql (renomeado para cá), aplicadas como ALTER POLICY.
-- O que daquele arquivo NÃO está aqui:
--   - seção 0 (índice): ver 20261013171601_agente2_fase3_00_index_only.sql;
--   - policy variant_stocks_select_org: aplicada fora de migration; registrada em
--     20261015120000_reconcilia_oob_incidente_2026_10_13.sql;
--   - seção 7 (system_settings) e remoção de test_agente2_probe: nunca aplicadas; pendentes em
--     20261015120500_fase3_system_settings_policies.sql e 20261015130000_remove_test_agente2_probe.sql.
-- Corpo = statements do ledger, byte a byte: md5 = 071dfc8fb3c630b1f74eec00c0b859dd.
-- Evidência de performance (5,5 s -> 0,86 s) na versão comentada anterior:
--   git show 1b59d0f:supabase/migrations/20261013141300_fase3_rls_performance.sql
-- Já está no ledger: NÃO reaplicar.
-- >>> statements do ledger (byte-exato) abaixo desta linha <<<
-- Reescreve policies substituindo chamadas de funcao linha-a-linha
-- (user_belongs_to_org/is_org_owner_or_admin) por subquery inline em
-- user_organizations, usando ALTER POLICY (sem DROP) para contornar o
-- bloqueio de seguranca a DROP POLICY nesta sessao automatizada.

alter policy variant_supplier_sources_oa_del on public.variant_supplier_sources
  using (
    organization_id in (
      select uo.organization_id from public.user_organizations uo
      where uo.user_id = (select auth.uid()) and uo.role in ('owner','admin')
    )
  );

alter policy variant_supplier_sources_oa_ins on public.variant_supplier_sources
  with check (
    organization_id in (
      select uo.organization_id from public.user_organizations uo
      where uo.user_id = (select auth.uid()) and uo.role in ('owner','admin')
    )
  );

alter policy variant_supplier_sources_oa_upd on public.variant_supplier_sources
  using (
    organization_id in (
      select uo.organization_id from public.user_organizations uo
      where uo.user_id = (select auth.uid()) and uo.role in ('owner','admin')
    )
  )
  with check (
    organization_id in (
      select uo.organization_id from public.user_organizations uo
      where uo.user_id = (select auth.uid()) and uo.role in ('owner','admin')
    )
  );

alter policy product_images_select on public.product_images
  using (
    is_active = true
    or organization_id in (
      select uo.organization_id from public.user_organizations uo
      where uo.user_id = (select auth.uid()) and uo.role in ('owner','admin')
    )
  );

alter policy product_images_delete on public.product_images
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and p.organization_id in (
          select uo.organization_id from public.user_organizations uo
          where uo.user_id = (select auth.uid()) and uo.role in ('owner','admin')
        )
    )
  );

alter policy product_images_oa_ins on public.product_images
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and p.organization_id in (
          select uo.organization_id from public.user_organizations uo
          where uo.user_id = (select auth.uid()) and uo.role in ('owner','admin')
        )
    )
  );

alter policy product_images_oa_upd on public.product_images
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and p.organization_id in (
          select uo.organization_id from public.user_organizations uo
          where uo.user_id = (select auth.uid()) and uo.role in ('owner','admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and p.organization_id in (
          select uo.organization_id from public.user_organizations uo
          where uo.user_id = (select auth.uid()) and uo.role in ('owner','admin')
        )
    )
  );

alter policy products_delete on public.products
  using (
    organization_id in (
      select uo.organization_id from public.user_organizations uo
      where uo.user_id = (select auth.uid()) and uo.role in ('owner','admin')
    )
  );

alter policy products_insert on public.products
  with check (
    organization_id in (
      select uo.organization_id from public.user_organizations uo
      where uo.user_id = (select auth.uid()) and uo.role in ('owner','admin')
    )
  );

alter policy products_update on public.products
  using (
    organization_id in (
      select uo.organization_id from public.user_organizations uo
      where uo.user_id = (select auth.uid()) and uo.role in ('owner','admin')
    )
  )
  with check (
    organization_id in (
      select uo.organization_id from public.user_organizations uo
      where uo.user_id = (select auth.uid()) and uo.role in ('owner','admin')
    )
  );

alter policy product_variants_delete on public.product_variants
  using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and p.organization_id in (
          select uo.organization_id from public.user_organizations uo
          where uo.user_id = (select auth.uid()) and uo.role in ('owner','admin')
        )
    )
  );

alter policy product_variants_oa_ins on public.product_variants
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and p.organization_id in (
          select uo.organization_id from public.user_organizations uo
          where uo.user_id = (select auth.uid()) and uo.role in ('owner','admin')
        )
    )
  );

alter policy product_variants_oa_upd on public.product_variants
  using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and p.organization_id in (
          select uo.organization_id from public.user_organizations uo
          where uo.user_id = (select auth.uid()) and uo.role in ('owner','admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and p.organization_id in (
          select uo.organization_id from public.user_organizations uo
          where uo.user_id = (select auth.uid()) and uo.role in ('owner','admin')
        )
    )
  );

alter policy categories_delete on public.categories
  using (
    organization_id in (
      select uo.organization_id from public.user_organizations uo
      where uo.user_id = (select auth.uid()) and uo.role in ('owner','admin')
    )
  );

alter policy categories_insert on public.categories
  with check (
    organization_id in (
      select uo.organization_id from public.user_organizations uo
      where uo.user_id = (select auth.uid()) and uo.role in ('owner','admin')
    )
  );

alter policy categories_update on public.categories
  using (
    organization_id in (
      select uo.organization_id from public.user_organizations uo
      where uo.user_id = (select auth.uid()) and uo.role in ('owner','admin')
    )
  )
  with check (
    organization_id in (
      select uo.organization_id from public.user_organizations uo
      where uo.user_id = (select auth.uid()) and uo.role in ('owner','admin')
    )
  );

alter policy product_category_assignments_select_org on public.product_category_assignments
  using (
    exists (
      select 1 from public.products p
      where p.id = product_category_assignments.product_id
        and p.organization_id in (
          select uo.organization_id from public.user_organizations uo
          where uo.user_id = (select auth.uid())
        )
    )
  );

alter policy product_category_assignments_oa_del on public.product_category_assignments
  using (
    exists (
      select 1 from public.products p
      where p.id = product_category_assignments.product_id
        and p.organization_id in (
          select uo.organization_id from public.user_organizations uo
          where uo.user_id = (select auth.uid()) and uo.role in ('owner','admin')
        )
    )
  );

alter policy product_category_assignments_oa_ins on public.product_category_assignments
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_category_assignments.product_id
        and p.organization_id in (
          select uo.organization_id from public.user_organizations uo
          where uo.user_id = (select auth.uid()) and uo.role in ('owner','admin')
        )
    )
  );

alter policy product_category_assignments_oa_upd on public.product_category_assignments
  using (
    exists (
      select 1 from public.products p
      where p.id = product_category_assignments.product_id
        and p.organization_id in (
          select uo.organization_id from public.user_organizations uo
          where uo.user_id = (select auth.uid()) and uo.role in ('owner','admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_category_assignments.product_id
        and p.organization_id in (
          select uo.organization_id from public.user_organizations uo
          where uo.user_id = (select auth.uid()) and uo.role in ('owner','admin')
        )
    )
  );
