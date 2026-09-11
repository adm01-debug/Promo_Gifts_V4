
-- Estende fn_ingestion_run_open para aceitar o feed 'customization_options'
CREATE OR REPLACE FUNCTION public.fn_ingestion_run_open(p_supplier_code text, p_feed text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare v_sid uuid := public.fn_resolve_supplier(p_supplier_code); v_run uuid;
begin
  if p_feed not in ('products','stock','customization','customization_options') then
    raise exception 'feed invalido: %', p_feed;
  end if;
  insert into supplier_import_batches(supplier_id, status, notes)
    values (v_sid, 'running', 'ingestao '||p_feed||' ('||p_supplier_code||')')
    returning id into v_run;
  insert into ingestion_run_log(run_id, supplier_code, feed, status)
    values (v_run, p_supplier_code, p_feed, 'running');
  return v_run;
end $function$;
;
