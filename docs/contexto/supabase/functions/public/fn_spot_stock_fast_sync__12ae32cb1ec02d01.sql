CREATE OR REPLACE FUNCTION public.fn_spot_stock_fast_sync()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sid      CONSTANT uuid := 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0';
  v_vss      int := 0;
  v_variants int := 0;
  v_fixed    int := 0;
BEGIN
  IF NOT pg_try_advisory_xact_lock(hashtext('fn_spot_stock_fast_sync')::bigint) THEN
    RETURN jsonb_build_object('skipped','lock_ocupado','synced_at',now());
  END IF;

  -- PASSO 1: Bronze → VSS (6 janelas brutas, sem filtro — auditoria)
  WITH bronze AS (
    SELECT spr.supplier_sku AS sku,
      COALESCE((spr.stock_data->>'Quantity')::int,0) AS qty,
      NULLIF(spr.stock_data->>'NextQuantity1','')::int AS nq1, NULLIF(spr.stock_data->>'NextDate1','')::date AS nd1,
      NULLIF(spr.stock_data->>'NextQuantity2','')::int AS nq2, NULLIF(spr.stock_data->>'NextDate2','')::date AS nd2,
      NULLIF(spr.stock_data->>'NextQuantity3','')::int AS nq3, NULLIF(spr.stock_data->>'NextDate3','')::date AS nd3,
      NULLIF(spr.stock_data->>'NextQuantity4','')::int AS nq4, NULLIF(spr.stock_data->>'NextDate4','')::date AS nd4,
      NULLIF(spr.stock_data->>'NextQuantity5','')::int AS nq5, NULLIF(spr.stock_data->>'NextDate5','')::date AS nd5,
      NULLIF(spr.stock_data->>'NextQuantity6','')::int AS nq6, NULLIF(spr.stock_data->>'NextDate6','')::date AS nd6
    FROM supplier_products_raw spr
    WHERE spr.supplier_id=v_sid AND spr.stock_data IS NOT NULL AND spr.stock_data?'Quantity'
  )
  UPDATE variant_supplier_sources vss
  SET quantity=b.qty, stock_main_warehouse=b.qty,
      next_quantity_1=b.nq1, next_date_1=b.nd1, next_quantity_2=b.nq2, next_date_2=b.nd2,
      next_quantity_3=b.nq3, next_date_3=b.nd3, next_quantity_4=b.nq4, next_date_4=b.nd4,
      next_quantity_5=b.nq5, next_date_5=b.nd5, next_quantity_6=b.nq6, next_date_6=b.nd6,
      source='bronze_spot', last_synced_at=now(), updated_at=now()
  FROM bronze b WHERE vss.supplier_sku=b.sku AND vss.supplier_id=v_sid;
  GET DIAGNOSTICS v_vss = ROW_COUNT;

  -- PASSO 2: Bronze → PV (GOLD) com GUARD: só datas > CURRENT_DATE chegam ao Gold
  PERFORM set_config('app.bulk_import_mode','true',true);
  WITH bronze AS (
    SELECT supplier_sku AS sku,
           COALESCE((stock_data->>'Quantity')::int,0) AS qty,
           -- Guard anti-stale: datas passadas → NULL no PV (VSS mantém o bruto)
           CASE WHEN NULLIF(stock_data->>'NextDate1','')::date > CURRENT_DATE
                THEN NULLIF(stock_data->>'NextQuantity1','')::int ELSE NULL END AS nq1,
           CASE WHEN NULLIF(stock_data->>'NextDate1','')::date > CURRENT_DATE
                THEN NULLIF(stock_data->>'NextDate1','')::date    ELSE NULL END AS nd1,
           CASE WHEN NULLIF(stock_data->>'NextDate2','')::date > CURRENT_DATE
                THEN NULLIF(stock_data->>'NextQuantity2','')::int ELSE NULL END AS nq2,
           CASE WHEN NULLIF(stock_data->>'NextDate2','')::date > CURRENT_DATE
                THEN NULLIF(stock_data->>'NextDate2','')::date    ELSE NULL END AS nd2,
           CASE WHEN NULLIF(stock_data->>'NextDate3','')::date > CURRENT_DATE
                THEN NULLIF(stock_data->>'NextQuantity3','')::int ELSE NULL END AS nq3,
           CASE WHEN NULLIF(stock_data->>'NextDate3','')::date > CURRENT_DATE
                THEN NULLIF(stock_data->>'NextDate3','')::date    ELSE NULL END AS nd3,
           CASE WHEN NULLIF(stock_data->>'NextDate4','')::date > CURRENT_DATE
                THEN NULLIF(stock_data->>'NextQuantity4','')::int ELSE NULL END AS nq4,
           CASE WHEN NULLIF(stock_data->>'NextDate4','')::date > CURRENT_DATE
                THEN NULLIF(stock_data->>'NextDate4','')::date    ELSE NULL END AS nd4,
           CASE WHEN NULLIF(stock_data->>'NextDate5','')::date > CURRENT_DATE
                THEN NULLIF(stock_data->>'NextQuantity5','')::int ELSE NULL END AS nq5,
           CASE WHEN NULLIF(stock_data->>'NextDate5','')::date > CURRENT_DATE
                THEN NULLIF(stock_data->>'NextDate5','')::date    ELSE NULL END AS nd5,
           CASE WHEN NULLIF(stock_data->>'NextDate6','')::date > CURRENT_DATE
                THEN NULLIF(stock_data->>'NextQuantity6','')::int ELSE NULL END AS nq6,
           CASE WHEN NULLIF(stock_data->>'NextDate6','')::date > CURRENT_DATE
                THEN NULLIF(stock_data->>'NextDate6','')::date    ELSE NULL END AS nd6
    FROM supplier_products_raw
    WHERE supplier_id=v_sid AND stock_data IS NOT NULL AND stock_data?'Quantity'
  )
  UPDATE product_variants pv
  SET stock_quantity  = b.qty,
      next_quantity_1 = b.nq1, next_date_1 = b.nd1,
      next_quantity_2 = b.nq2, next_date_2 = b.nd2,
      next_quantity_3 = b.nq3, next_date_3 = b.nd3,
      next_quantity_4 = b.nq4, next_date_4 = b.nd4,
      next_quantity_5 = b.nq5, next_date_5 = b.nd5,
      next_quantity_6 = b.nq6, next_date_6 = b.nd6,
      last_sync_at    = now()
  FROM bronze b
  WHERE pv.supplier_sku=b.sku AND pv.is_active=true
    AND (pv.stock_quantity  IS DISTINCT FROM b.qty
      OR pv.next_quantity_1 IS DISTINCT FROM b.nq1 OR pv.next_date_1 IS DISTINCT FROM b.nd1
      OR pv.next_quantity_2 IS DISTINCT FROM b.nq2 OR pv.next_date_2 IS DISTINCT FROM b.nd2
      OR pv.next_quantity_3 IS DISTINCT FROM b.nq3 OR pv.next_date_3 IS DISTINCT FROM b.nd3
      OR pv.next_quantity_4 IS DISTINCT FROM b.nq4 OR pv.next_date_4 IS DISTINCT FROM b.nd4
      OR pv.next_quantity_5 IS DISTINCT FROM b.nq5 OR pv.next_date_5 IS DISTINCT FROM b.nd5
      OR pv.next_quantity_6 IS DISTINCT FROM b.nq6 OR pv.next_date_6 IS DISTINCT FROM b.nd6);
  GET DIAGNOSTICS v_variants = ROW_COUNT;

  -- PASSO 3: is_stockout
  UPDATE products p SET is_stockout=(p.stock_quantity<=0),updated_at=now()
  WHERE p.supplier_id=v_sid AND p.is_active=true
    AND p.is_stockout IS DISTINCT FROM (p.stock_quantity<=0);
  GET DIAGNOSTICS v_fixed = ROW_COUNT;

  RETURN jsonb_build_object(
    'vss_updated',v_vss,'variants_updated',v_variants,'stockout_corrected',v_fixed,
    'source','bronze_spot',
    'guard_pv','datas_passadas_NAO_propagadas_ao_gold',
    'fixes',jsonb_build_array('B03','B05','FINAL-01-GUARD'), 'janelas_pv',6, 'synced_at',now()
  );
END;
$function$
