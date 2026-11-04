CREATE OR REPLACE FUNCTION public.fn_sync_stock_bronze_to_gold(p_supplier_id uuid, p_parent_ref text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_silver_updated int;
  v_gold_updated   int;
BEGIN
  -- ── PASSO 1: Bronze stock_data → Silver ──────────────────────────────────
  -- Atualiza SOMENTE os campos de estoque no Silver
  -- Fonte: supplier_products_raw.stock_data (Bronze)
  UPDATE public.produtos_padronizacao_variantes ppv
  SET
    stock_quantity  = public.fn_safe_int(spr.stock_data->>'Quantity'),
    next_quantity_1 = NULLIF(public.fn_safe_int(spr.stock_data->>'NextQuantity1'), 0),
    next_quantity_2 = NULLIF(public.fn_safe_int(spr.stock_data->>'NextQuantity2'), 0),
    next_quantity_3 = NULLIF(public.fn_safe_int(spr.stock_data->>'NextQuantity3'), 0),
    next_date_1     = NULLIF(spr.stock_data->>'NextDate1', '')::date,
    next_date_2     = NULLIF(spr.stock_data->>'NextDate2', '')::date,
    next_date_3     = NULLIF(spr.stock_data->>'NextDate3', '')::date,
    updated_at      = now()
  FROM public.supplier_products_raw spr
  WHERE ppv.raw_id      = spr.id
    AND ppv.supplier_id = p_supplier_id
    AND spr.supplier_id = p_supplier_id
    AND spr.stock_data  IS NOT NULL
    AND (p_parent_ref IS NULL OR ppv.parent_reference = p_parent_ref);

  GET DIAGNOSTICS v_silver_updated = ROW_COUNT;

  -- ── PASSO 2: Silver → Gold (VSS) ─────────────────────────────────────────
  -- Propaga stock_quantity e lotes 1-3 do Silver para o Gold
  -- COALESCE garante que VSS sem Silver ainda preserva valor existente
  UPDATE public.variant_supplier_sources vss
  SET
    quantity             = COALESCE(ppv.stock_quantity, vss.quantity),
    stock_main_warehouse = COALESCE(ppv.stock_quantity, vss.stock_main_warehouse),
    next_quantity_1      = COALESCE(ppv.next_quantity_1, vss.next_quantity_1),
    next_quantity_2      = COALESCE(ppv.next_quantity_2, vss.next_quantity_2),
    next_quantity_3      = COALESCE(ppv.next_quantity_3, vss.next_quantity_3),
    next_date_1          = COALESCE(ppv.next_date_1, vss.next_date_1),
    next_date_2          = COALESCE(ppv.next_date_2, vss.next_date_2),
    next_date_3          = COALESCE(ppv.next_date_3, vss.next_date_3),
    last_synced_at       = now(),
    source               = 'silver',
    updated_at           = now()
  FROM public.produtos_padronizacao_variantes ppv
  WHERE vss.variant_id  = ppv.variant_id
    AND vss.supplier_id = ppv.supplier_id
    AND ppv.supplier_id = p_supplier_id
    AND ppv.stock_quantity IS NOT NULL
    AND (p_parent_ref IS NULL OR ppv.parent_reference = p_parent_ref);

  GET DIAGNOSTICS v_gold_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'silver_updated', v_silver_updated,
    'gold_updated',   v_gold_updated,
    'supplier_id',    p_supplier_id,
    'parent_ref',     p_parent_ref
  );
END;
$function$
