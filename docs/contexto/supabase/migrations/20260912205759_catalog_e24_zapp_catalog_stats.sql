-- E24: RPC read-only para os KPIs do Catálogo (ZAPP). Aditiva, não altera
-- nenhuma tabela existente. security definer + search_path fixo (padrão
-- de segurança do projeto); grant só ao role usado pela service key.
create or replace function public.zapp_catalog_stats()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'total', (select count(*) from products where is_active and is_deleted is not true),
    'in_stock', (select count(*) from products where is_active and is_deleted is not true and not is_stockout),
    'featured', (select count(*) from products where is_active and is_deleted is not true and is_featured
      and (is_featured_expires_at is null or is_featured_expires_at > now())),
    'new_30d', (select count(*) from products where is_active and is_deleted is not true
      and (created_at > now() - interval '30 days'
        or (is_new and (is_new_expires_at is null or is_new_expires_at > now())))),
    'bestseller', (select count(*) from products where is_active and is_deleted is not true and is_bestseller
      and (is_bestseller_expires_at is null or is_bestseller_expires_at > now())),
    'kits', (select count(*) from products where is_active and is_deleted is not true and is_kit),
    'low_stock', (select count(*) from products where is_active and is_deleted is not true
      and stock_quantity between 1 and 10),
    'categories_root', (select count(*) from categories where level = 1 and is_active and deleted_at is null),
    'suppliers_active', (select count(distinct supplier_id) from products
      where is_active and is_deleted is not true),
    'last_sync_at', (select max(last_sync_at) from products),
    'last_update_at', (select max(updated_at) from products),
    'by_month', (
      select coalesce(jsonb_agg(jsonb_build_object('month', month, 'count', count) order by month), '[]'::jsonb)
      from (
        select to_char(date_trunc('month', created_at), 'YYYY-MM') as month, count(*) as count
        from products
        where is_active and is_deleted is not true
          and created_at >= date_trunc('month', now()) - interval '6 months'
        group by 1
      ) months
    )
  );
$$;

revoke all on function public.zapp_catalog_stats() from public, anon;
grant execute on function public.zapp_catalog_stats() to service_role;
