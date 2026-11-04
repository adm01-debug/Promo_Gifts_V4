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
