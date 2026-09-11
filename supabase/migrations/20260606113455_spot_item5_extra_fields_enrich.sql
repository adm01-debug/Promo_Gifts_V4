-- Silver enrich: Item1 taxonomia + Item4 SEO + Item5 extras
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
      updated_at = now()
  FROM public.supplier_products_raw spr
  WHERE pp.raw_id = spr.id
    AND pp.supplier_id = p_supplier_id
    AND (p_parent_ref IS NULL OR pp.supplier_reference = p_parent_ref);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END $$;

-- Gold enrich: Item1 + Item4 + Item5 extras
CREATE OR REPLACE FUNCTION public.fn_spot_gold_enrich(p_supplier_id uuid, p_parent_ref text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
DECLARE v_tax int; v_cat int; v_seo int; v_extra int;
BEGIN
  PERFORM set_config('app.bulk_import_mode','true', true);

  UPDATE public.products p
  SET supplier_type=pp.supplier_type, supplier_type_code=pp.supplier_type_code,
      supplier_subtype=pp.supplier_subtype, supplier_subtype_code=pp.supplier_subtype_code
  FROM public.produtos_padronizacao pp
  WHERE pp.product_id=p.id AND pp.supplier_id=p_supplier_id
    AND (p_parent_ref IS NULL OR pp.supplier_reference=p_parent_ref);
  GET DIAGNOSTICS v_tax = ROW_COUNT;

  UPDATE public.products p
  SET category_id = m.category_id
  FROM public.produtos_padronizacao pp
  JOIN public.supplier_subtype_category_map m
    ON m.supplier_id = pp.supplier_id
   AND lower(unaccent(m.subtype_desc)) = lower(unaccent(pp.supplier_subtype))
  WHERE pp.product_id=p.id AND pp.supplier_id=p_supplier_id
    AND p.category_id IS NULL AND m.category_id IS NOT NULL
    AND (p_parent_ref IS NULL OR pp.supplier_reference=p_parent_ref);
  GET DIAGNOSTICS v_cat = ROW_COUNT;

  UPDATE public.products p
  SET ai_title        = COALESCE(nullif(pp.supplier_seo_name,''), p.ai_title),
      ai_description  = COALESCE(nullif(pp.supplier_seo_short_description,''), p.ai_description),
      og_description  = COALESCE(nullif(pp.supplier_seo_short_description,''), p.og_description),
      meta_description= CASE
          WHEN nullif(pp.supplier_seo_short_description,'') IS NOT NULL
           AND char_length(pp.supplier_seo_short_description) BETWEEN 50 AND 170
          THEN pp.supplier_seo_short_description ELSE p.meta_description END
  FROM public.produtos_padronizacao pp
  WHERE pp.product_id=p.id AND pp.supplier_id=p_supplier_id
    AND (p_parent_ref IS NULL OR pp.supplier_reference=p_parent_ref)
    AND (pp.supplier_seo_name IS NOT NULL OR pp.supplier_seo_short_description IS NOT NULL);
  GET DIAGNOSTICS v_seo = ROW_COUNT;

  -- Item5: certificados, gramatura têxtil, referências relacionadas, flags sazonal/pvc-free
  UPDATE public.products p
  SET certificates       = COALESCE(pp.certificates, p.certificates),
      certificate_files  = COALESCE(pp.certificate_files, p.certificate_files),
      related_references = COALESCE(pp.related_references, p.related_references),
      weight_gr          = COALESCE(pp.weight_gr, p.weight_gr),
      is_seasonal        = COALESCE(pp.is_seasonal, p.is_seasonal),
      pvc_free           = COALESCE(pp.pvc_free, p.pvc_free)
  FROM public.produtos_padronizacao pp
  WHERE pp.product_id=p.id AND pp.supplier_id=p_supplier_id
    AND (p_parent_ref IS NULL OR pp.supplier_reference=p_parent_ref);
  GET DIAGNOSTICS v_extra = ROW_COUNT;

  RETURN jsonb_build_object('taxonomia_gold',v_tax,'categorias_por_subtype',v_cat,'seo_atualizados',v_seo,'extras_atualizados',v_extra);
END $$;

-- Variante enrich: reposição 4..6 (Item3) + YourPrice (Item5)
CREATE OR REPLACE FUNCTION public.fn_spot_variant_repl_enrich(p_supplier_id uuid, p_parent_ref text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
DECLARE v_n integer;
BEGIN
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

  UPDATE public.produtos_padronizacao_variantes ppv
  SET your_price = public.fn_safe_num(spr.raw_data->>'YourPrice'), updated_at = now()
  FROM public.supplier_products_raw spr
  WHERE ppv.raw_id = spr.id AND ppv.supplier_id = p_supplier_id
    AND (p_parent_ref IS NULL OR ppv.parent_reference = p_parent_ref);

  UPDATE public.variant_supplier_sources vss
  SET next_quantity_4 = ppv.next_quantity_4, next_quantity_5 = ppv.next_quantity_5, next_quantity_6 = ppv.next_quantity_6,
      next_date_4 = ppv.next_date_4, next_date_5 = ppv.next_date_5, next_date_6 = ppv.next_date_6,
      your_price = ppv.your_price
  FROM public.produtos_padronizacao_variantes ppv
  WHERE vss.variant_id = ppv.variant_id AND vss.supplier_id = ppv.supplier_id
    AND ppv.supplier_id = p_supplier_id
    AND (p_parent_ref IS NULL OR ppv.parent_reference = p_parent_ref);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END $$;;
