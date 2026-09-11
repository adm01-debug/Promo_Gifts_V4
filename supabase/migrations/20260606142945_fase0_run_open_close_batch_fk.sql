-- run_open agora cunha um lote real em supplier_import_batches (satisfaz a FK import_batch_id)
-- e usa o id do lote como run_id (unifica correlação: run_id == import_batch_id).
create or replace function public.fn_ingestion_run_open(p_supplier_code text, p_feed text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_sid uuid := public.fn_resolve_supplier(p_supplier_code); v_run uuid;
begin
  if p_feed not in ('products','stock','customization') then raise exception 'feed invalido: %', p_feed; end if;
  insert into supplier_import_batches(supplier_id, status, notes)
    values (v_sid, 'running', 'ingestao '||p_feed||' ('||p_supplier_code||')')
    returning id into v_run;
  insert into ingestion_run_log(run_id, supplier_code, feed, status)
    values (v_run, p_supplier_code, p_feed, 'running');
  return v_run;
end $$;

-- run_close fecha o log E o lote (mapeia contadores p/ o batch)
create or replace function public.fn_ingestion_run_close(
  p_run_id uuid, p_status text, p_fetched int, p_upserted int, p_skipped int, p_errors int,
  p_error_samples jsonb default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  update ingestion_run_log
     set finished_at=now(), duration_s=extract(epoch from (now()-started_at)),
         status=p_status, fetched=p_fetched, upserted=p_upserted, skipped=p_skipped, errors=p_errors,
         error_samples=coalesce(p_error_samples, error_samples)
   where run_id=p_run_id;
  update supplier_import_batches
     set finished_at=now(), status=p_status,
         products_imported=p_upserted, products_errors=p_errors,
         error_log=coalesce(p_error_samples, error_log)
   where id=p_run_id;
end $$;;
