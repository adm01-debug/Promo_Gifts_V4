create or replace function public.fn_refresh_supplier_sync_telemetry(p_supplier_id uuid default null)
returns table(supplier_code text, linhas bigint, novo_status text, novo_last_sync timestamptz)
language plpgsql
as $$
begin
  return query
  with agg as (
    select r.supplier_id,
           count(*)::bigint                                   as n,
           max(r.imported_at)                                  as max_imported,
           count(*) filter (where r.status = 'failed')         as n_failed
    from public.supplier_products_raw r
    where p_supplier_id is null or r.supplier_id = p_supplier_id
    group by r.supplier_id
  ),
  upd as (
    update public.suppliers s
       set last_full_sync_at = a.max_imported,
           last_sync_status  = case when a.n_failed > 0 then 'failed' else 'completed' end,
           last_sync_error   = case when a.n_failed > 0 then s.last_sync_error else null end,
           updated_at        = now()
      from agg a
     where s.id = a.supplier_id
    returning s.code, a.n, s.last_sync_status, s.last_full_sync_at
  )
  select u.code::text, u.n::bigint, u.last_sync_status::text, u.last_full_sync_at
  from upd u;
end;
$$;

comment on function public.fn_refresh_supplier_sync_telemetry(uuid)
  is 'Recalcula last_full_sync_at/last_sync_status de suppliers a partir do estado real de supplier_products_raw. Idempotente. Chamar ao fim de cada sync (n8n) ou com NULL para todos.';;
