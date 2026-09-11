-- Silver: campos SEO crus do fornecedor
ALTER TABLE public.produtos_padronizacao
  ADD COLUMN IF NOT EXISTS supplier_seo_name              text,
  ADD COLUMN IF NOT EXISTS supplier_seo_short_description text;

-- Silver enrich (Item 1 taxonomia + Item 4 SEO)
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
      updated_at = now()
  FROM public.supplier_products_raw spr
  WHERE pp.raw_id = spr.id
    AND pp.supplier_id = p_supplier_id
    AND (p_parent_ref IS NULL OR pp.supplier_reference = p_parent_ref);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END $$;

-- Gold enrich (Item 1 taxonomia+categoria + Item 4 SEO)
CREATE OR REPLACE FUNCTION public.fn_spot_gold_enrich(p_supplier_id uuid, p_parent_ref text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
DECLARE v_tax int; v_cat int; v_seo int;
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

  -- SEO do fornecedor: ai_* (limpos) + meta/og description (preferir cópia do fornecedor)
  UPDATE public.products p
  SET ai_title        = COALESCE(nullif(pp.supplier_seo_name,''), p.ai_title),
      ai_description  = COALESCE(nullif(pp.supplier_seo_short_description,''), p.ai_description),
      meta_description= COALESCE(nullif(pp.supplier_seo_short_description,''), p.meta_description),
      og_description  = COALESCE(nullif(pp.supplier_seo_short_description,''), p.og_description)
  FROM public.produtos_padronizacao pp
  WHERE pp.product_id=p.id AND pp.supplier_id=p_supplier_id
    AND (p_parent_ref IS NULL OR pp.supplier_reference=p_parent_ref)
    AND (pp.supplier_seo_name IS NOT NULL OR pp.supplier_seo_short_description IS NOT NULL);
  GET DIAGNOSTICS v_seo = ROW_COUNT;

  RETURN jsonb_build_object('taxonomia_gold', v_tax, 'categorias_por_subtype', v_cat, 'seo_atualizados', v_seo);
END $$;;
