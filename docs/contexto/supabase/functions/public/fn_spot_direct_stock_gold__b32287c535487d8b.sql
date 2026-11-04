CREATE OR REPLACE FUNCTION public.fn_spot_direct_stock_gold(p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sid      CONSTANT uuid := 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0';
  v_item     jsonb; v_sku text; v_vid uuid; v_qty int; v_vss_rows int;
  v_updated  int := 0; v_skipped int := 0; v_errors int := 0;
  v_errs     jsonb := '[]'::jsonb;
  -- Janelas raw (para VSS — sem filtro, auditorável)
  v_nq1 int; v_nq2 int; v_nq3 int; v_nq4 int; v_nq5 int; v_nq6 int;
  v_nd1 date; v_nd2 date; v_nd3 date; v_nd4 date; v_nd5 date; v_nd6 date;
  -- Janelas guardadas (para PV Gold — só datas futuras)
  v_gnq1 int; v_gnq2 int; v_gnq3 int;
  v_gnd1 date; v_gnd2 date; v_gnd3 date;
BEGIN
  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'fn_spot_direct_stock_gold: p_items deve ser array jsonb';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    BEGIN
      v_sku := NULLIF(TRIM(COALESCE(v_item->>'Sku',v_item->>'WebSku',v_item->>'sku',v_item->>'webSku')),'');
      IF v_sku IS NULL THEN v_skipped := v_skipped + 1; CONTINUE; END IF;

      SELECT vss.variant_id INTO v_vid FROM public.variant_supplier_sources vss
      WHERE vss.supplier_sku=v_sku AND vss.supplier_id=v_sid LIMIT 1;
      IF v_vid IS NULL THEN
        SELECT pv.id INTO v_vid FROM public.product_variants pv WHERE pv.supplier_sku=v_sku LIMIT 1;
      END IF;
      IF v_vid IS NULL THEN v_skipped := v_skipped + 1; CONTINUE; END IF;

      v_qty  := COALESCE(NULLIF(v_item->>'Quantity','')::int, 0);

      -- Raw (para VSS — sem guard)
      v_nq1:=CASE WHEN NULLIF(v_item->>'NextQuantity1','') IS NOT NULL THEN (v_item->>'NextQuantity1')::int END;
      v_nq2:=CASE WHEN NULLIF(v_item->>'NextQuantity2','') IS NOT NULL THEN (v_item->>'NextQuantity2')::int END;
      v_nq3:=CASE WHEN NULLIF(v_item->>'NextQuantity3','') IS NOT NULL THEN (v_item->>'NextQuantity3')::int END;
      v_nq4:=CASE WHEN NULLIF(v_item->>'NextQuantity4','') IS NOT NULL THEN (v_item->>'NextQuantity4')::int END;
      v_nq5:=CASE WHEN NULLIF(v_item->>'NextQuantity5','') IS NOT NULL THEN (v_item->>'NextQuantity5')::int END;
      v_nq6:=CASE WHEN NULLIF(v_item->>'NextQuantity6','') IS NOT NULL THEN (v_item->>'NextQuantity6')::int END;
      v_nd1:=CASE WHEN NULLIF(v_item->>'NextDate1','') IS NOT NULL THEN (v_item->>'NextDate1')::date END;
      v_nd2:=CASE WHEN NULLIF(v_item->>'NextDate2','') IS NOT NULL THEN (v_item->>'NextDate2')::date END;
      v_nd3:=CASE WHEN NULLIF(v_item->>'NextDate3','') IS NOT NULL THEN (v_item->>'NextDate3')::date END;
      v_nd4:=CASE WHEN NULLIF(v_item->>'NextDate4','') IS NOT NULL THEN (v_item->>'NextDate4')::date END;
      v_nd5:=CASE WHEN NULLIF(v_item->>'NextDate5','') IS NOT NULL THEN (v_item->>'NextDate5')::date END;
      v_nd6:=CASE WHEN NULLIF(v_item->>'NextDate6','') IS NOT NULL THEN (v_item->>'NextDate6')::date END;

      -- Guard para PV Gold: apenas datas > CURRENT_DATE chegam ao Gold
      v_gnd1 := CASE WHEN v_nd1 > CURRENT_DATE THEN v_nd1 ELSE NULL END;
      v_gnq1 := CASE WHEN v_gnd1 IS NOT NULL   THEN v_nq1 ELSE NULL END;
      v_gnd2 := CASE WHEN v_nd2 > CURRENT_DATE THEN v_nd2 ELSE NULL END;
      v_gnq2 := CASE WHEN v_gnd2 IS NOT NULL   THEN v_nq2 ELSE NULL END;
      v_gnd3 := CASE WHEN v_nd3 > CURRENT_DATE THEN v_nd3 ELSE NULL END;
      v_gnq3 := CASE WHEN v_gnd3 IS NOT NULL   THEN v_nq3 ELSE NULL END;

      -- VSS: raw (sem guard — auditável)
      UPDATE public.variant_supplier_sources
      SET quantity=v_qty, stock_main_warehouse=v_qty,
          next_quantity_1=v_nq1,next_date_1=v_nd1,next_quantity_2=v_nq2,next_date_2=v_nd2,
          next_quantity_3=v_nq3,next_date_3=v_nd3,next_quantity_4=v_nq4,next_date_4=v_nd4,
          next_quantity_5=v_nq5,next_date_5=v_nd5,next_quantity_6=v_nq6,next_date_6=v_nd6,
          source='hot_path_stock', last_synced_at=now(), updated_at=now()
      WHERE variant_id=v_vid AND supplier_id=v_sid;
      GET DIAGNOSTICS v_vss_rows = ROW_COUNT;

      -- PV Gold: com guard (só futuras)
      UPDATE public.product_variants
      SET stock_quantity  = v_qty,
          next_quantity_1 = v_gnq1, next_date_1 = v_gnd1,
          next_quantity_2 = v_gnq2, next_date_2 = v_gnd2,
          next_quantity_3 = v_gnq3, next_date_3 = v_gnd3,
          last_sync_at    = now()
      WHERE id = v_vid;

      v_updated := v_updated + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      IF jsonb_array_length(v_errs)<15 THEN
        v_errs := v_errs || jsonb_build_object('sku',v_sku,'err',SQLERRM,'state',SQLSTATE);
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'feed','hot_path_stock','supplier','STRICKER',
    'updated',v_updated,'skipped',v_skipped,'errors',v_errors,'error_samples',v_errs,
    'guard_pv','datas_passadas_NAO_chegam_ao_gold',
    'fix_b04','next_date_1..3_com_guard_CURRENT_DATE', 'updated_at',now()
  );
END;
$function$
