CREATE OR REPLACE FUNCTION public.fn_xbz_enrich_gold_extractors(p_supplier uuid DEFAULT 'd6718a29-e954-4c1b-bd84-03ea24884900'::uuid, p_limit integer DEFAULT NULL::integer, p_only_missing boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_material int:=0; v_category int:=0;
BEGIN
  CREATE TEMP TABLE _gold_xbz ON COMMIT DROP AS
    SELECT product_id, name FROM (
      SELECT DISTINCT ON (pr.id) pr.id AS product_id, pr.name, pr.created_at
      FROM public.variant_supplier_sources vss
      JOIN public.product_variants pv ON pv.id=vss.variant_id
      JOIN public.products pr ON pr.id=pv.product_id
      WHERE vss.supplier_id=p_supplier AND pr.name IS NOT NULL
        AND (
          NOT p_only_missing
          OR NOT EXISTS (SELECT 1 FROM public.product_properties pp2
                          WHERE pp2.product_id=pr.id AND pp2.property_code='material_xbz_primary')
        )
      ORDER BY pr.id, pr.created_at DESC
    ) sub
    ORDER BY created_at DESC
    LIMIT COALESCE(p_limit, 1000000000);

  IF NOT EXISTS (SELECT 1 FROM _gold_xbz) THEN
    RETURN jsonb_build_object('produtos_escopo',0,'note','sem_novidades');
  END IF;

  INSERT INTO public.product_properties (product_id, property_code, property_value, source, raw_value)
  SELECT g.product_id, 'material_xbz_primary',
         public.extract_xbz_material_primary(upper(g.name), upper(g.name)),
         'xbz_extractor',
         public.extract_xbz_material_primary(upper(g.name), upper(g.name))
  FROM _gold_xbz g
  WHERE public.extract_xbz_material_primary(upper(g.name), upper(g.name)) IS NOT NULL
    AND btrim(public.extract_xbz_material_primary(upper(g.name), upper(g.name))) <> ''
  ON CONFLICT (product_id, property_code) DO UPDATE
    SET property_value=EXCLUDED.property_value, raw_value=EXCLUDED.raw_value,
        source=EXCLUDED.source, updated_at=now()
  WHERE public.product_properties.source='xbz_extractor';
  GET DIAGNOSTICS v_material = ROW_COUNT;

  INSERT INTO public.product_category_assignments (product_id, category_id, is_primary, display_order)
  SELECT DISTINCT g.product_id, xcat.category_id, false, 995
  FROM _gold_xbz g
  CROSS JOIN LATERAL public.classify_xbz_category(upper(g.name)) xcat
  WHERE xcat.confidence IN ('high','medium')
    AND xcat.category_id IS NOT NULL AND xcat.category_name <> 'NÃO CLASSIFICADO'
  ON CONFLICT (product_id, category_id) DO NOTHING;
  GET DIAGNOSTICS v_category = ROW_COUNT;

  RETURN jsonb_build_object(
    'produtos_escopo', (SELECT count(*) FROM _gold_xbz),
    'material_xbz_upsert', v_material,
    'category_xbz_insert', v_category
  );
END $function$
