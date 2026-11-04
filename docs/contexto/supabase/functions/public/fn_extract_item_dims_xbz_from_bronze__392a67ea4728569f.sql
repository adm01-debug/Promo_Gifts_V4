CREATE OR REPLACE FUNCTION public.fn_extract_item_dims_xbz_from_bronze(p_limit integer DEFAULT 200)
 RETURNS TABLE(component_id uuid, component_name text, sku text, resultado text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rec    RECORD;
  v_raw    RECORD;
  v_raw_id UUID;
  v_alt    NUMERIC; v_lar NUMERIC; v_prof NUMERIC; v_peso NUMERIC;
  v_base   TEXT;
BEGIN
  FOR v_rec IN
    SELECT pkc.id AS comp_id, pkc.component_name,
           pkc.component_sku AS sku,
           REGEXP_REPLACE(pkc.component_sku, '-[A-Z]{2,4}$', '') AS base_sku,
           pkc.kit_product_id
    FROM product_kit_components pkc
    JOIN products p ON p.id = pkc.kit_product_id
    JOIN suppliers s ON s.id = p.supplier_id AND s.code = 'XBZ'
    WHERE pkc.enrichment_status = 'missing'
      AND pkc.is_packaging = FALSE
      AND pkc.component_sku IS NOT NULL
    LIMIT p_limit
  LOOP
    -- Match exato primeiro, depois base SKU
    SELECT raw_data INTO v_raw
    FROM supplier_products_raw
    WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900'
      AND (
        raw_data->>'CodigoAmigavel' = v_rec.sku  OR
        raw_data->>'CodigoAmigavel' = v_rec.base_sku OR
        raw_data->>'CodigoAmigavel' ILIKE v_rec.base_sku || '%'
      )
    ORDER BY CASE WHEN raw_data->>'CodigoAmigavel' = v_rec.sku THEN 0 ELSE 1 END
    LIMIT 1;

    IF NOT FOUND THEN
      component_id := v_rec.comp_id; component_name := v_rec.component_name;
      sku := v_rec.sku; resultado := 'no_match';
      RETURN NEXT; CONTINUE;
    END IF;

    v_alt  := NULLIF((v_raw.raw_data->>'Altura')::NUMERIC, 0);
    v_lar  := NULLIF((v_raw.raw_data->>'Largura')::NUMERIC, 0);
    v_prof := NULLIF((v_raw.raw_data->>'Profundidade')::NUMERIC, 0);
    v_peso := NULLIF((v_raw.raw_data->>'Peso')::NUMERIC, 0);

    IF v_alt IS NULL AND v_lar IS NULL AND v_peso IS NULL THEN
      component_id := v_rec.comp_id; component_name := v_rec.component_name;
      sku := v_rec.sku; resultado := 'zero_dims';
      RETURN NEXT; CONTINUE;
    END IF;

    INSERT INTO kit_component_enrichment_raw (
      kit_product_id, kit_component_id, raw_component_name,
      supplier_component_code, source, source_ref, source_confidence, raw_data
    ) VALUES (
      v_rec.kit_product_id, v_rec.comp_id, v_rec.component_name,
      v_rec.sku, 'supplier_api', v_rec.sku, 0.85,
      jsonb_strip_nulls(jsonb_build_object(
        'component_name',    v_rec.component_name,
        'unit',              'cm',
        'height_mm',         CASE WHEN v_alt  IS NOT NULL THEN ROUND(v_alt  * 10)::INTEGER END,
        'width_mm',          CASE WHEN v_lar  IS NOT NULL THEN ROUND(v_lar  * 10)::INTEGER END,
        'length_mm',         CASE WHEN v_prof IS NOT NULL THEN ROUND(v_prof * 10)::INTEGER END,
        'weight_g',          CASE WHEN v_peso IS NOT NULL THEN ROUND(v_peso)::INTEGER END,
        'is_packaging',      FALSE
      ))
    ) RETURNING id INTO v_raw_id;

    component_id := v_rec.comp_id; component_name := v_rec.component_name; sku := v_rec.sku;
    resultado := 'ok:h' || COALESCE(ROUND(v_alt*10)::TEXT,'?') || 'mm';
    RETURN NEXT;
  END LOOP;
END;
$function$
