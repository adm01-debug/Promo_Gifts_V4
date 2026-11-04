CREATE OR REPLACE FUNCTION public.fn_bronze_mark_absent(p_supplier_code text, p_run_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_sid uuid := public.fn_resolve_supplier(p_supplier_code); v_n int;
begin
  update supplier_products_raw
     set status = 'skipped'::supplier_raw_status, updated_at = now()
   where supplier_id = v_sid
     and status::text in ('pending','processing','processed')
     and coalesce(import_batch_id,'00000000-0000-0000-0000-000000000000'::uuid) <> p_run_id;
  get diagnostics v_n = row_count;
  return v_n;
end $function$
