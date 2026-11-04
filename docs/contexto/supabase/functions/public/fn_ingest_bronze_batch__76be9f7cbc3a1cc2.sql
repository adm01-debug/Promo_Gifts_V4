CREATE OR REPLACE FUNCTION public.fn_ingest_bronze_batch(p_supplier_code text, p_feed text, p_run_id uuid, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_sid uuid := public.fn_resolve_supplier(p_supplier_code);
  v_item jsonb; v_ref text; v_tco text;
  v_fetched int := 0; v_upserted int := 0; v_skipped int := 0; v_errors int := 0;
  v_errsamples jsonb := '[]'::jsonb;
begin
  if p_feed not in ('products','stock','customization') then raise exception 'feed invalido: %', p_feed; end if;
  if jsonb_typeof(p_items) <> 'array' then raise exception 'p_items deve ser array jsonb'; end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_fetched := v_fetched + 1;
    begin
      if p_feed in ('products','stock') then
        v_ref := coalesce(nullif(v_item->>'Sku',''), nullif(v_item->>'sku',''),
                          nullif(v_item->>'supplier_reference',''), nullif(v_item->>'referencia',''),
                          nullif(v_item->>'ProdReference',''), nullif(v_item->>'codigo',''));
        if v_ref is null then
          v_skipped := v_skipped + 1;
          if jsonb_array_length(v_errsamples) < 20 then
            v_errsamples := v_errsamples || jsonb_build_object('motivo','sem_chave_natural','item',v_item);
          end if;
          continue;
        end if;
        if p_feed = 'products'
          then perform public.insert_supplier_product_raw(v_sid, v_ref, v_item, p_run_id);
          else perform public.upsert_supplier_stock_raw  (v_sid, v_ref, v_item, p_run_id);
        end if;
        v_upserted := v_upserted + 1;
      else  -- customization
        v_tco := coalesce(nullif(v_item->>'TableCodeOption',''), nullif(v_item->>'table_code_option',''));
        if v_tco is null then
          v_skipped := v_skipped + 1;
          if jsonb_array_length(v_errsamples) < 20 then
            v_errsamples := v_errsamples || jsonb_build_object('motivo','sem_table_code_option','item',v_item);
          end if;
          continue;
        end if;
        perform public.upsert_supplier_customization_raw(
          v_sid, v_tco, v_item,
          nullif(v_item->>'TableCode',''),
          coalesce(nullif(v_item->>'CustomizationTypeName',''), nullif(v_item->>'customization_type','')),
          p_run_id);
        v_upserted := v_upserted + 1;
      end if;
    exception when others then
      v_errors := v_errors + 1;
      if jsonb_array_length(v_errsamples) < 20 then
        v_errsamples := v_errsamples || jsonb_build_object('erro',SQLERRM,'sqlstate',SQLSTATE,'ref',coalesce(v_ref,v_tco));
      end if;
    end;
  end loop;

  return jsonb_build_object('supplier_code',p_supplier_code,'feed',p_feed,'run_id',p_run_id,
    'fetched',v_fetched,'upserted',v_upserted,'skipped',v_skipped,'errors',v_errors,
    'error_samples',v_errsamples);
end $function$
