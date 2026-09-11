CREATE OR REPLACE FUNCTION public.fn_asia_stock_fast_sync(p_skus jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_asia   uuid := 'd2734e23-d633-4819-bb15-e51aa44e2118';
  v_org    uuid := '5db5aee1-064b-4ef4-9193-345dcd8274ea';
  r        jsonb;
  v_sku    text; v_stock int; v_price numeric; v_vid uuid; v_pid uuid;
  v_seen   int := 0; v_ok int := 0; v_nao int := 0; v_erros int := 0;
  v_nq_propagados int := 0; v_vss_nq_updated int := 0;
  v_prods  uuid[] := '{}';
  v_skus_processados text[] := '{}';
  v_t0     timestamptz := clock_timestamp();
BEGIN
  IF NOT pg_try_advisory_xact_lock(hashtext('fn_asia_stock_fast_sync')::bigint) THEN
    RETURN jsonb_build_object('success', true, 'skipped', 'lock_ocupado');
  END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(p_skus)
  LOOP
    BEGIN
      v_seen  := v_seen + 1;
      v_sku   := r->>'sku';
      v_stock := GREATEST(0, COALESCE(fn_safe_int(r->>'qtd_estoque'), 0));
      v_price := fn_safe_num(r->>'preco');

      IF v_sku IS NULL OR v_sku = '' THEN CONTINUE; END IF;

      SELECT pv.id, pv.product_id INTO v_vid, v_pid
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE p.supplier_id = v_asia
        AND (pv.supplier_sku = v_sku OR pv.sku = 'ASIA-' || v_sku)
        AND pv.is_active = true
      LIMIT 1;

      IF v_vid IS NULL THEN v_nao := v_nao + 1; CONTINUE; END IF;

      UPDATE product_variants
      SET stock_quantity = v_stock, updated_at = now()
      WHERE id = v_vid;

      INSERT INTO variant_supplier_sources (
        variant_id, supplier_id, quantity, cost_price,
        last_synced_at, sync_status, updated_at, organization_id
      ) VALUES (
        v_vid, v_asia, v_stock, v_price, now(), 'synced', now(), v_org
      )
      ON CONFLICT (variant_id, supplier_id) DO UPDATE SET
        quantity       = EXCLUDED.quantity,
        cost_price     = CASE WHEN EXCLUDED.cost_price > 0 THEN EXCLUDED.cost_price ELSE variant_supplier_sources.cost_price END,
        last_synced_at = now(), sync_status = 'synced', updated_at = now();

      v_ok := v_ok + 1;
      IF NOT (v_pid = ANY(v_prods)) THEN v_prods := array_append(v_prods, v_pid); END IF;
      v_skus_processados := array_append(v_skus_processados, v_sku);

    EXCEPTION WHEN OTHERS THEN v_erros := v_erros + 1;
    END;
  END LOOP;

  UPDATE products p
  SET stock_quantity = (SELECT COALESCE(SUM(pv.stock_quantity),0) FROM product_variants pv WHERE pv.product_id=p.id AND pv.is_active=true),
      last_sync_at=now(), updated_at=now()
  WHERE p.id = ANY(v_prods);

  -- PASSO 4: Bronze -> VSS (sem guard -- auditavel)
  UPDATE variant_supplier_sources vss
  SET
    next_quantity_1 = fn_safe_int(COALESCE(spr.stock_data,spr.raw_data)->'previsao_entrega'->0->>'quantidade'),
    next_date_1     = CASE WHEN COALESCE(COALESCE(spr.stock_data,spr.raw_data)->'previsao_entrega'->0->>'data','') ~ '^\d{4}-\d{2}-\d{2}'
                      THEN LEFT(COALESCE(spr.stock_data,spr.raw_data)->'previsao_entrega'->0->>'data',10)::date ELSE NULL END,
    next_quantity_2 = fn_safe_int(COALESCE(spr.stock_data,spr.raw_data)->'previsao_entrega'->1->>'quantidade'),
    next_date_2     = CASE WHEN COALESCE(COALESCE(spr.stock_data,spr.raw_data)->'previsao_entrega'->1->>'data','') ~ '^\d{4}-\d{2}-\d{2}'
                      THEN LEFT(COALESCE(spr.stock_data,spr.raw_data)->'previsao_entrega'->1->>'data',10)::date ELSE NULL END,
    next_quantity_3 = fn_safe_int(COALESCE(spr.stock_data,spr.raw_data)->'previsao_entrega'->2->>'quantidade'),
    next_date_3     = CASE WHEN COALESCE(COALESCE(spr.stock_data,spr.raw_data)->'previsao_entrega'->2->>'data','') ~ '^\d{4}-\d{2}-\d{2}'
                      THEN LEFT(COALESCE(spr.stock_data,spr.raw_data)->'previsao_entrega'->2->>'data',10)::date ELSE NULL END,
    updated_at      = now()
  FROM supplier_products_raw spr
  WHERE vss.supplier_id=v_asia AND spr.supplier_id=v_asia
    AND (vss.supplier_sku=spr.supplier_sku OR vss.supplier_sku='ASIA-'||spr.supplier_sku)
    AND spr.supplier_sku=ANY(v_skus_processados);
  GET DIAGNOSTICS v_vss_nq_updated = ROW_COUNT;

  -- PASSO 5: Bronze -> PV GOLD com GUARD > CURRENT_DATE
  -- FIX FINAL-02: nq1/nq2/nq3 agora usam o MESMO guard de regex dos ndX.
  -- Antes, nq1 fazia LEFT(COALESCE(...,''),10)::date sem regex -> ''::date -> erro 22007 (data NULL/vazia).
  PERFORM set_config('app.bulk_import_mode','true',true);
  WITH bronze_data AS (
    SELECT spr.supplier_sku AS sku,
           -- Guard: so datas futuras e ISO-validas chegam ao Gold
           CASE WHEN COALESCE(COALESCE(spr.stock_data,spr.raw_data)->'previsao_entrega'->0->>'data','') ~ '^\d{4}-\d{2}-\d{2}'
                 AND LEFT(COALESCE(spr.stock_data,spr.raw_data)->'previsao_entrega'->0->>'data',10)::date > CURRENT_DATE
                THEN fn_safe_int(COALESCE(spr.stock_data,spr.raw_data)->'previsao_entrega'->0->>'quantidade') ELSE NULL END AS nq1,
           CASE WHEN COALESCE(COALESCE(spr.stock_data,spr.raw_data)->'previsao_entrega'->0->>'data','') ~ '^\d{4}-\d{2}-\d{2}'
                 AND LEFT(COALESCE(spr.stock_data,spr.raw_data)->'previsao_entrega'->0->>'data',10)::date > CURRENT_DATE
                THEN LEFT(COALESCE(spr.stock_data,spr.raw_data)->'previsao_entrega'->0->>'data',10)::date ELSE NULL END AS nd1,
           CASE WHEN COALESCE(COALESCE(spr.stock_data,spr.raw_data)->'previsao_entrega'->1->>'data','') ~ '^\d{4}-\d{2}-\d{2}'
                 AND LEFT(COALESCE(spr.stock_data,spr.raw_data)->'previsao_entrega'->1->>'data',10)::date > CURRENT_DATE
                THEN fn_safe_int(COALESCE(spr.stock_data,spr.raw_data)->'previsao_entrega'->1->>'quantidade') ELSE NULL END AS nq2,
           CASE WHEN COALESCE(COALESCE(spr.stock_data,spr.raw_data)->'previsao_entrega'->1->>'data','') ~ '^\d{4}-\d{2}-\d{2}'
                 AND LEFT(COALESCE(spr.stock_data,spr.raw_data)->'previsao_entrega'->1->>'data',10)::date > CURRENT_DATE
                THEN LEFT(COALESCE(spr.stock_data,spr.raw_data)->'previsao_entrega'->1->>'data',10)::date ELSE NULL END AS nd2,
           CASE WHEN COALESCE(COALESCE(spr.stock_data,spr.raw_data)->'previsao_entrega'->2->>'data','') ~ '^\d{4}-\d{2}-\d{2}'
                 AND LEFT(COALESCE(spr.stock_data,spr.raw_data)->'previsao_entrega'->2->>'data',10)::date > CURRENT_DATE
                THEN fn_safe_int(COALESCE(spr.stock_data,spr.raw_data)->'previsao_entrega'->2->>'quantidade') ELSE NULL END AS nq3,
           CASE WHEN COALESCE(COALESCE(spr.stock_data,spr.raw_data)->'previsao_entrega'->2->>'data','') ~ '^\d{4}-\d{2}-\d{2}'
                 AND LEFT(COALESCE(spr.stock_data,spr.raw_data)->'previsao_entrega'->2->>'data',10)::date > CURRENT_DATE
                THEN LEFT(COALESCE(spr.stock_data,spr.raw_data)->'previsao_entrega'->2->>'data',10)::date ELSE NULL END AS nd3
    FROM supplier_products_raw spr
    WHERE spr.supplier_id=v_asia AND spr.supplier_sku=ANY(v_skus_processados)
  )
  UPDATE product_variants pv
  SET next_quantity_1=b.nq1, next_date_1=b.nd1,
      next_quantity_2=b.nq2, next_date_2=b.nd2,
      next_quantity_3=b.nq3, next_date_3=b.nd3,
      updated_at=now()
  FROM bronze_data b
  WHERE (pv.supplier_sku=b.sku OR pv.supplier_sku='ASIA-'||b.sku) AND pv.is_active=true
    AND (pv.next_quantity_1 IS DISTINCT FROM b.nq1 OR pv.next_date_1 IS DISTINCT FROM b.nd1
      OR pv.next_quantity_2 IS DISTINCT FROM b.nq2 OR pv.next_date_2 IS DISTINCT FROM b.nd2
      OR pv.next_quantity_3 IS DISTINCT FROM b.nq3 OR pv.next_date_3 IS DISTINCT FROM b.nd3);
  GET DIAGNOSTICS v_nq_propagados = ROW_COUNT;

  RETURN jsonb_build_object(
    'success',true,'vistos',v_seen,'aplicados',v_ok,'nao_encontrados',v_nao,
    'produtos_recalc',array_length(v_prods,1),'erros',v_erros,
    'vss_nq_updated',v_vss_nq_updated,'pv_nq_propagados',v_nq_propagados,
    'guard_pv','datas_passadas_NAO_chegam_ao_gold_ASIA',
    'fixes',jsonb_build_array('B01a','B01b','B01c','B01d','FINAL-01-GUARD-ASIA','FINAL-02-NQ-REGEX-GUARD'),
    'segundos',round(extract(epoch FROM clock_timestamp()-v_t0)::numeric,1)
  );
END;
$function$;;
