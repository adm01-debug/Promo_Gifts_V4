CREATE OR REPLACE FUNCTION public.fn_sm_stock_guard()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sm constant uuid := '841cd690-210a-422a-908c-7676828db272';
  v_unlocked int := 0;
  v_silver   int := 0;
  v_var      int := 0;
  v_gold     int := 0;
  v_vss      int := 0;
  v_pv_gold  int := 0;
  v_stockout int := 0;
BEGIN
  IF NOT pg_try_advisory_xact_lock(74108922) THEN
    RETURN jsonb_build_object('skipped', 'lock_busy', 'ts', now());
  END IF;

  -- Identificar-se como pipeline (não gerar auto-locks no trigger de manual edits)
  PERFORM set_config('app.write_source', 'pipeline', true);

  -- 0. Auto-limpeza: stock_quantity lockado é sempre acidente
  UPDATE products
  SET locked_fields = array_remove(locked_fields, 'stock_quantity')
  WHERE supplier_id = v_sm
    AND 'stock_quantity' = ANY(COALESCE(locked_fields, '{}'));
  GET DIAGNOSTICS v_unlocked = ROW_COUNT;

  -- 1. Silver ← Bronze  [regex blindado: só ASCII 0-9, máx 9 dígitos = sem overflow int]
  UPDATE produtos_padronizacao pp
  SET stock_quantity = GREATEST((r.raw_data->>'estoque')::int, 0),
      updated_at = now()
  FROM supplier_products_raw r
  WHERE r.id = pp.raw_id
    AND pp.supplier_id = v_sm
    AND (r.raw_data->>'estoque') ~ '^[0-9]{1,9}$'
    AND pp.stock_quantity IS DISTINCT FROM GREATEST((r.raw_data->>'estoque')::int, 0);
  GET DIAGNOSTICS v_silver = ROW_COUNT;

  -- 2. Variantes Silver ← pai
  UPDATE produtos_padronizacao_variantes ppv
  SET stock_quantity = pp.stock_quantity,
      updated_at = now()
  FROM produtos_padronizacao pp
  WHERE ppv.pad_id = pp.id
    AND ppv.supplier_id = v_sm
    AND pp.stock_quantity IS NOT NULL
    AND ppv.stock_quantity IS DISTINCT FROM pp.stock_quantity;
  GET DIAGNOSTICS v_var = ROW_COUNT;

  -- 3. Gold products ← Bronze  [regex blindado]
  UPDATE products p
  SET stock_quantity = GREATEST((r.raw_data->>'estoque')::int, 0),
      updated_at = now()
  FROM produtos_padronizacao pp
  JOIN supplier_products_raw r ON r.id = pp.raw_id
  WHERE pp.product_id = p.id
    AND pp.supplier_id = v_sm
    AND (r.raw_data->>'estoque') ~ '^[0-9]{1,9}$'
    AND p.stock_quantity IS DISTINCT FROM GREATEST((r.raw_data->>'estoque')::int, 0)
    AND NOT ('stock_quantity' = ANY(COALESCE(p.locked_fields, '{}')));
  GET DIAGNOSTICS v_gold = ROW_COUNT;

  -- 4. NOVO: VSS ← Bronze (fonte do agregado do trigger fn_sync_product_stock_cache)
  --    Corrigir aqui ELIMINA a gangorra: trigger trg_sync_stock_from_vss
  --    reconsolida products.stock_quantity + is_stockout automaticamente.
  --    GREATEST respeita constraint chk_vss_quantity_positive.
  UPDATE variant_supplier_sources vss
  SET quantity = GREATEST((r.raw_data->>'estoque')::int, 0),
      updated_at = now()
  FROM product_variants pv
  JOIN produtos_padronizacao pp ON pp.product_id = pv.product_id
  JOIN supplier_products_raw r ON r.id = pp.raw_id
  WHERE vss.variant_id = pv.id
    AND vss.supplier_id = v_sm
    AND pp.supplier_id = v_sm
    AND (r.raw_data->>'estoque') ~ '^[0-9]{1,9}$'
    AND vss.quantity IS DISTINCT FROM GREATEST((r.raw_data->>'estoque')::int, 0);
  GET DIAGNOSTICS v_vss = ROW_COUNT;

  -- 5. NOVO: product_variants (Gold) ← Bronze
  --    Sem cascata: trigger trg_sync_stock_from_variant só dispara em is_active.
  UPDATE product_variants pv
  SET stock_quantity = GREATEST((r.raw_data->>'estoque')::int, 0),
      updated_at = now()
  FROM produtos_padronizacao pp
  JOIN supplier_products_raw r ON r.id = pp.raw_id
  WHERE pv.product_id = pp.product_id
    AND pp.supplier_id = v_sm
    AND (r.raw_data->>'estoque') ~ '^[0-9]{1,9}$'
    AND pv.stock_quantity IS DISTINCT FROM GREATEST((r.raw_data->>'estoque')::int, 0);
  GET DIAGNOSTICS v_pv_gold = ROW_COUNT;

  -- 6. NOVO: is_stockout residual (campo derivado: sempre coerente com stock)
  UPDATE products p
  SET is_stockout = (p.stock_quantity <= 0),
      updated_at = now()
  FROM produtos_padronizacao pp
  WHERE pp.product_id = p.id
    AND pp.supplier_id = v_sm
    AND p.is_stockout IS DISTINCT FROM (p.stock_quantity <= 0);
  GET DIAGNOSTICS v_stockout = ROW_COUNT;

  RETURN jsonb_build_object(
    'locks_cleaned',  v_unlocked,
    'silver_fixed',   v_silver,
    'variants_fixed', v_var,
    'gold_fixed',     v_gold,
    'vss_fixed',      v_vss,
    'pv_gold_fixed',  v_pv_gold,
    'stockout_fixed', v_stockout,
    'ts', now());
END;
$function$
