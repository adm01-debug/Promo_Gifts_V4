-- Reconciliação NÃO-DESTRUTIVA: leva o enrich de variante (do feed/Silver) para a
-- variante VIVA legada, casando por color_code (esquema de SKU legado != feed).
-- Para têxteis multi-tamanho por cor, mapeia a nível de cor (refinar com size_code depois).
CREATE OR REPLACE FUNCTION public.fn_spot_reconcile_variant_to_legacy(p_supplier_id uuid, p_parent_ref text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
DECLARE v_n integer;
BEGIN
  PERFORM set_config('app.bulk_import_mode','true', true);
  UPDATE public.variant_supplier_sources vss
  SET your_price      = f.your_price,
      next_quantity_1 = f.next_quantity_1, next_quantity_2 = f.next_quantity_2, next_quantity_3 = f.next_quantity_3,
      next_quantity_4 = f.next_quantity_4, next_quantity_5 = f.next_quantity_5, next_quantity_6 = f.next_quantity_6,
      next_date_1 = f.next_date_1, next_date_2 = f.next_date_2, next_date_3 = f.next_date_3,
      next_date_4 = f.next_date_4, next_date_5 = f.next_date_5, next_date_6 = f.next_date_6
  FROM public.product_variants lv
  JOIN public.products p ON p.id = lv.product_id AND p.supplier_id = p_supplier_id
  JOIN LATERAL (
      SELECT ppv.*
      FROM public.produtos_padronizacao_variantes ppv
      WHERE ppv.supplier_id = p_supplier_id
        AND ppv.parent_reference = p.supplier_reference
        AND ppv.color_code = lv.color_code
      ORDER BY ppv.variant_reference
      LIMIT 1
  ) f ON TRUE
  WHERE vss.variant_id = lv.id AND vss.supplier_id = p_supplier_id
    AND lv.is_active AND lv.color_code IS NOT NULL
    AND (p_parent_ref IS NULL OR p.supplier_reference = p_parent_ref);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END $$;;
