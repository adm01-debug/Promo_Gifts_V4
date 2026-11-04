CREATE OR REPLACE FUNCTION public.fn_upsert_stocks_bulk_spot(p_stocks jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_supplier_id uuid;
  v_updated     int := 0;
  v_skipped     int := 0;
  v_item        jsonb;
  v_sku         text;
BEGIN
  SELECT id INTO v_supplier_id FROM suppliers WHERE code='STRICKER' LIMIT 1;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_stocks) LOOP

    v_sku := NULLIF(TRIM(COALESCE(
               v_item->>'Sku', v_item->>'WebSku',
               v_item->>'sku', v_item->>'webSku')), '');

    IF v_sku IS NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    UPDATE supplier_products_raw
    SET
      stock_data = jsonb_build_object(
        'Sku',           v_sku,
        'Quantity',      COALESCE(NULLIF(v_item->>'Quantity','')::int, 0),
        -- 6 janelas de reposição (NextQuantity/NextDate 1..6)
        'NextQuantity1', NULLIF(v_item->>'NextQuantity1',''),
        'NextDate1',     NULLIF(v_item->>'NextDate1',''),
        'NextQuantity2', NULLIF(v_item->>'NextQuantity2',''),
        'NextDate2',     NULLIF(v_item->>'NextDate2',''),
        'NextQuantity3', NULLIF(v_item->>'NextQuantity3',''),
        'NextDate3',     NULLIF(v_item->>'NextDate3',''),
        'NextQuantity4', NULLIF(v_item->>'NextQuantity4',''),
        'NextDate4',     NULLIF(v_item->>'NextDate4',''),
        'NextQuantity5', NULLIF(v_item->>'NextQuantity5',''),
        'NextDate5',     NULLIF(v_item->>'NextDate5',''),
        'NextQuantity6', NULLIF(v_item->>'NextQuantity6',''),
        'NextDate6',     NULLIF(v_item->>'NextDate6',''),
        '_updated_at',   now()::text
      ),
      updated_at = now()
    WHERE supplier_id = v_supplier_id
      AND supplier_sku = v_sku;

    IF FOUND THEN
      v_updated := v_updated + 1;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;

  END LOOP;

  RETURN jsonb_build_object(
    'updated',     v_updated,
    'skipped',     v_skipped,
    'total_input', jsonb_array_length(p_stocks),
    'synced_at',   now()
  );
END;
$function$
