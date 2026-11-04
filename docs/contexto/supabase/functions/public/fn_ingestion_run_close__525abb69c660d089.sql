CREATE OR REPLACE FUNCTION public.fn_ingestion_run_close(p_run_id uuid, p_status text, p_fetched integer, p_upserted integer, p_skipped integer, p_errors integer, p_error_samples jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$
