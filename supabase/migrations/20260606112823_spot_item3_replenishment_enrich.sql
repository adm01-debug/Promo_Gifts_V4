CREATE OR REPLACE FUNCTION public.fn_spot_variant_repl_enrich(p_supplier_id uuid, p_parent_ref text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
DECLARE v_n integer;
BEGIN
  -- Silver variante: lotes 4..6 a partir do stock_data (Bronze)
  UPDATE public.produtos_padronizacao_variantes ppv
  SET next_quantity_4 = public.fn_safe_int(spr.stock_data->>'NextQuantity4'),
      next_quantity_5 = public.fn_safe_int(spr.stock_data->>'NextQuantity5'),
      next_quantity_6 = public.fn_safe_int(spr.stock_data->>'NextQuantity6'),
      next_date_4 = CASE WHEN spr.stock_data->>'NextDate4' ~ '^\d{4}-\d{2}-\d{2}' THEN left(spr.stock_data->>'NextDate4',10)::date END,
      next_date_5 = CASE WHEN spr.stock_data->>'NextDate5' ~ '^\d{4}-\d{2}-\d{2}' THEN left(spr.stock_data->>'NextDate5',10)::date END,
      next_date_6 = CASE WHEN spr.stock_data->>'NextDate6' ~ '^\d{4}-\d{2}-\d{2}' THEN left(spr.stock_data->>'NextDate6',10)::date END,
      updated_at = now()
  FROM public.supplier_products_raw spr
  WHERE ppv.raw_id = spr.id AND ppv.supplier_id = p_supplier_id AND spr.stock_data IS NOT NULL
    AND (p_parent_ref IS NULL OR ppv.parent_reference = p_parent_ref);

  -- Gold vss: lotes 4..6 a partir do Silver variante
  UPDATE public.variant_supplier_sources vss
  SET next_quantity_4 = ppv.next_quantity_4, next_quantity_5 = ppv.next_quantity_5, next_quantity_6 = ppv.next_quantity_6,
      next_date_4 = ppv.next_date_4, next_date_5 = ppv.next_date_5, next_date_6 = ppv.next_date_6
  FROM public.produtos_padronizacao_variantes ppv
  WHERE vss.variant_id = ppv.variant_id AND vss.supplier_id = ppv.supplier_id
    AND ppv.supplier_id = p_supplier_id
    AND (p_parent_ref IS NULL OR ppv.parent_reference = p_parent_ref);

  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END $$;;
