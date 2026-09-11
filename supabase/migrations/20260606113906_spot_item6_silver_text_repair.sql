CREATE OR REPLACE FUNCTION public.fn_spot_silver_enrich(p_supplier_id uuid, p_parent_ref text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
DECLARE v_n integer;
BEGIN
  UPDATE public.produtos_padronizacao pp
  SET supplier_type        = nullif(btrim(spr.raw_data->>'Type'),''),
      supplier_type_code    = nullif(btrim(spr.raw_data->>'TypeCode'),''),
      supplier_subtype      = nullif(btrim(spr.raw_data->>'SubType'),''),
      supplier_subtype_code = nullif(btrim(spr.raw_data->>'SubTypeCode'),''),
      supplier_seo_name              = public.fn_fix_mojibake(nullif(btrim(spr.raw_data->>'SEOName'),'')),
      supplier_seo_short_description = public.fn_fix_mojibake(nullif(btrim(spr.raw_data->>'SEOShortDescription'),'')),
      certificates       = (SELECT to_jsonb(array_agg(btrim(e))) FROM unnest(string_to_array(spr.raw_data->>'Certificates', ',')) e WHERE btrim(e) <> ''),
      certificate_files  = (SELECT to_jsonb(array_agg(btrim(e))) FROM unnest(string_to_array(spr.raw_data->>'CertificateFiles', ',')) e WHERE btrim(e) <> ''),
      related_references = (SELECT to_jsonb(array_agg(btrim(e))) FROM unnest(string_to_array(spr.raw_data->>'RelatedReferences', ',')) e WHERE btrim(e) <> ''),
      weight_gr          = public.fn_fix_mojibake(nullif(btrim(spr.raw_data->>'WeightGr'),'')),
      is_seasonal        = public.fn_safe_bool(spr.raw_data->>'IsSeasonal'),
      pvc_free           = public.fn_safe_bool(spr.raw_data->>'PvcFree'),
      -- Item 6: reparo de encoding (Ø/×/acentos) nos textos já populados pelo standardize
      name               = public.fn_fix_mojibake(pp.name),
      short_description  = public.fn_fix_mojibake(pp.short_description),
      description        = public.fn_fix_mojibake(pp.description),
      combined_sizes     = public.fn_fix_mojibake(pp.combined_sizes),
      dimensions_display = public.fn_fix_mojibake(pp.dimensions_display),
      updated_at = now()
  FROM public.supplier_products_raw spr
  WHERE pp.raw_id = spr.id
    AND pp.supplier_id = p_supplier_id
    AND (p_parent_ref IS NULL OR pp.supplier_reference = p_parent_ref);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END $$;;
