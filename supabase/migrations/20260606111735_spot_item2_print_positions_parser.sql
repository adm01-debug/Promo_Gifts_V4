CREATE OR REPLACE FUNCTION public.fn_spot_print_positions(p_supplier_id uuid, p_parent_ref text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
DECLARE v_n integer;
BEGIN
  -- idempotente: limpa posições dos produtos-alvo e recria
  DELETE FROM public.product_print_positions ppp
   USING public.produtos_padronizacao pp
   WHERE ppp.product_id = pp.product_id AND pp.supplier_id = p_supplier_id
     AND (p_parent_ref IS NULL OR pp.supplier_reference = p_parent_ref);

  INSERT INTO public.product_print_positions
    (product_id, position_index, component, location, composed_location, area_label,
     technique_list, table_full_code, table_codes, table_codes_options, max_colors, handling_costs,
     area_image, component_image, location_image)
  SELECT p.id, g.n,
    public.fn_fix_mojibake(nullif(btrim(spr.raw_data->>('Component'||g.n)),'')),
    public.fn_fix_mojibake(nullif(btrim(spr.raw_data->>('Location'||g.n)),'')),
    public.fn_fix_mojibake(nullif(btrim(spr.raw_data->>('ComposedLocation'||g.n)),'')),
    public.fn_fix_mojibake(nullif(btrim(spr.raw_data->>('Area'||g.n)),'')),
    CASE WHEN nullif(btrim(spr.raw_data->>('CustomizationTypes'||g.n)),'') IS NOT NULL
         THEN to_jsonb(string_to_array(btrim(spr.raw_data->>('CustomizationTypes'||g.n)), ', ')) END,
    nullif(btrim(spr.raw_data->>('TableFullCode'||g.n)),''),
    nullif(btrim(spr.raw_data->>('TableCodes'||g.n)),''),
    CASE WHEN nullif(btrim(spr.raw_data->>('TableCodesOptions'||g.n)),'') IS NOT NULL
         THEN to_jsonb(string_to_array(btrim(spr.raw_data->>('TableCodesOptions'||g.n)), ', ')) END,
    CASE WHEN nullif(btrim(spr.raw_data->>('MaxColors'||g.n)),'') IS NOT NULL
         THEN to_jsonb(string_to_array(btrim(spr.raw_data->>('MaxColors'||g.n)), ', ')) END,
    CASE WHEN nullif(btrim(spr.raw_data->>('HandlingCosts'||g.n)),'') IS NOT NULL
         THEN to_jsonb(string_to_array(btrim(spr.raw_data->>('HandlingCosts'||g.n)), ', ')) END,
    nullif(btrim(spr.raw_data->>('Area'||g.n||'Image')),''),
    nullif(btrim(spr.raw_data->>('Component'||g.n||'Image')),''),
    nullif(btrim(spr.raw_data->>('Location'||g.n||'Image')),'')
  FROM public.products p
  JOIN public.produtos_padronizacao pp ON pp.product_id=p.id AND pp.supplier_id=p_supplier_id
  JOIN public.supplier_products_raw spr ON spr.id=pp.raw_id
  CROSS JOIN generate_series(1,8) g(n)
  WHERE (p_parent_ref IS NULL OR pp.supplier_reference=p_parent_ref)
    AND coalesce(nullif(btrim(spr.raw_data->>('Component'||g.n)),''),
                 nullif(btrim(spr.raw_data->>('Area'||g.n)),''),
                 nullif(btrim(spr.raw_data->>('Location'||g.n)),'')) IS NOT NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END $$;;
