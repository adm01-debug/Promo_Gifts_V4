CREATE OR REPLACE FUNCTION public.fn_super_filtro_facets(p_search_term text DEFAULT NULL::text, p_category_slug text DEFAULT NULL::text, p_category_id uuid DEFAULT NULL::uuid, p_brands text[] DEFAULT NULL::text[], p_only_in_stock boolean DEFAULT false, p_min_price numeric DEFAULT NULL::numeric, p_max_price numeric DEFAULT NULL::numeric, p_target_audiences text[] DEFAULT NULL::text[], p_is_kit boolean DEFAULT NULL::boolean, p_is_textil boolean DEFAULT NULL::boolean, p_is_thermal boolean DEFAULT NULL::boolean, p_has_gift_box boolean DEFAULT NULL::boolean, p_material_groups text[] DEFAULT NULL::text[], p_technique_groups text[] DEFAULT NULL::text[], p_color_groups text[] DEFAULT NULL::text[], p_date_slugs text[] DEFAULT NULL::text[], p_endomarketing boolean DEFAULT NULL::boolean)
 RETURNS TABLE(facet_type text, facet_value text, facet_slug text, product_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_search_normalized text;
  v_tsquery           tsquery;
  v_category_uuid     uuid;
BEGIN
  IF p_search_term IS NOT NULL AND length(trim(p_search_term)) > 0 THEN
    v_search_normalized := lower(unaccent(trim(p_search_term)));
    BEGIN
      v_tsquery := websearch_to_tsquery('portuguese', unaccent(trim(p_search_term)));
    EXCEPTION WHEN OTHERS THEN v_tsquery := NULL; END;
    PERFORM set_config('pg_trgm.similarity_threshold', '0.2', true);
  END IF;

  IF p_category_id IS NOT NULL THEN
    v_category_uuid := p_category_id;
  ELSIF p_category_slug IS NOT NULL THEN
    SELECT c.id INTO v_category_uuid FROM categories c WHERE c.slug = p_category_slug LIMIT 1;
  END IF;

  RETURN QUERY
  WITH
  mat_filter   AS (SELECT DISTINCT pm.product_id FROM product_materials pm JOIN material_types mt ON mt.id=pm.material_id JOIN material_groups mg ON mg.id=mt.group_id WHERE p_material_groups IS NOT NULL AND mg.name=ANY(p_material_groups) AND pm.is_active=true),
  tech_filter  AS (SELECT DISTINCT pat.product_id FROM print_area_techniques pat JOIN tabela_preco_gravacao_oficial tpgo ON tpgo.id=pat.tabela_preco_id WHERE p_technique_groups IS NOT NULL AND tpgo.grupo_tecnica=ANY(p_technique_groups) AND pat.is_active=true),
  color_filter AS (SELECT DISTINCT pv.product_id FROM product_variants pv JOIN color_variations cv ON cv.id=pv.color_id JOIN color_groups cg ON cg.id=cv.group_id WHERE p_color_groups IS NOT NULL AND cg.name=ANY(p_color_groups) AND pv.is_active=true),
  date_filter  AS (SELECT DISTINCT pcd.product_id FROM product_commemorative_dates pcd JOIN commemorative_dates cd ON cd.id=pcd.commemorative_date_id WHERE p_date_slugs IS NOT NULL AND cd.slug=ANY(p_date_slugs) AND pcd.is_active=true),
  endo_filter  AS (SELECT DISTINCT pt.product_id FROM product_tags pt JOIN tags t ON t.id=pt.tag_id WHERE p_endomarketing=true AND t.slug='endomarketing' AND t.is_active=true),

  -- Conjunto base de produtos que passam nos filtros atuais
  base_ids AS (
    SELECT p.id
    FROM products p
    LEFT JOIN product_category_assignments pca ON pca.product_id=p.id AND pca.is_primary=true
    WHERE p.is_active=true AND p.is_deleted IS NOT TRUE
      AND (v_search_normalized IS NULL OR (v_tsquery IS NOT NULL AND p.search_vector@@v_tsquery) OR p.name%v_search_normalized OR lower(p.sku) LIKE '%'||v_search_normalized||'%')
      AND (v_category_uuid IS NULL OR pca.category_id=v_category_uuid OR p.main_category_id=v_category_uuid)
      AND (p_brands IS NULL OR p.brand=ANY(p_brands))
      AND (NOT p_only_in_stock OR p.is_stockout=false)
      AND (p_min_price IS NULL OR p.sale_price>=p_min_price)
      AND (p_max_price IS NULL OR p.sale_price<=p_max_price)
      AND (p_target_audiences IS NULL OR p.target_audience&&p_target_audiences)
      AND (p_is_kit IS NULL OR p.is_kit=p_is_kit)
      AND (p_is_textil IS NULL OR p.is_textil=p_is_textil)
      AND (p_is_thermal IS NULL OR p.is_thermal=p_is_thermal)
      AND (p_has_gift_box IS NULL OR p.has_gift_box=p_has_gift_box)
      AND (p_material_groups IS NULL  OR EXISTS(SELECT 1 FROM mat_filter   mf WHERE mf.product_id=p.id))
      AND (p_technique_groups IS NULL OR EXISTS(SELECT 1 FROM tech_filter  tf WHERE tf.product_id=p.id))
      AND (p_color_groups IS NULL     OR EXISTS(SELECT 1 FROM color_filter cf WHERE cf.product_id=p.id))
      AND (p_date_slugs IS NULL       OR EXISTS(SELECT 1 FROM date_filter  df WHERE df.product_id=p.id))
      AND (p_endomarketing IS NULL OR p_endomarketing=false OR EXISTS(SELECT 1 FROM endo_filter ef WHERE ef.product_id=p.id))
  )
  -- Brand facets
  SELECT 'brand', p.brand::text, LOWER(REGEXP_REPLACE(p.brand,'[^a-zA-Z0-9]','-','g'))::text, COUNT(DISTINCT p.id)
  FROM products p JOIN base_ids b ON b.id=p.id WHERE p.brand IS NOT NULL
  GROUP BY p.brand HAVING COUNT(DISTINCT p.id)>0

  UNION ALL
  -- Cor facets
  SELECT 'cor', cg.name, cg.slug, COUNT(DISTINCT b.id)
  FROM base_ids b JOIN product_variants pv ON pv.product_id=b.id AND pv.is_active=true
  JOIN color_variations cv ON cv.id=pv.color_id JOIN color_groups cg ON cg.id=cv.group_id
  GROUP BY cg.id,cg.name,cg.slug HAVING COUNT(DISTINCT b.id)>0

  UNION ALL
  -- Material facets
  SELECT 'material', mg.name, mg.slug, COUNT(DISTINCT b.id)
  FROM base_ids b JOIN product_materials pm ON pm.product_id=b.id AND pm.is_active=true
  JOIN material_types mt ON mt.id=pm.material_id JOIN material_groups mg ON mg.id=mt.group_id
  GROUP BY mg.id,mg.name,mg.slug HAVING COUNT(DISTINCT b.id)>0

  UNION ALL
  -- Técnica facets
  SELECT 'tecnica', tpgo.grupo_tecnica, LOWER(tpgo.grupo_tecnica), COUNT(DISTINCT b.id)
  FROM base_ids b JOIN print_area_techniques pat ON pat.product_id=b.id AND pat.is_active=true
  JOIN tabela_preco_gravacao_oficial tpgo ON tpgo.id=pat.tabela_preco_id
  WHERE tpgo.grupo_tecnica IS NOT NULL
  GROUP BY tpgo.grupo_tecnica HAVING COUNT(DISTINCT b.id)>0

  UNION ALL
  -- Target audience facets
  SELECT 'target_audience', 
    CASE val WHEN 'corporativo' THEN 'Corporativo' WHEN 'feminino' THEN 'Feminino'
             WHEN 'masculino' THEN 'Masculino' WHEN 'infantil' THEN 'Infantil'
             WHEN 'esportivo' THEN 'Esportivo' WHEN 'unissex' THEN 'Unissex'
             ELSE INITCAP(val) END,
    val, COUNT(DISTINCT b.id)
  FROM base_ids b JOIN products p ON p.id=b.id, UNNEST(p.target_audience) AS val
  GROUP BY val HAVING COUNT(DISTINCT b.id)>0;
END;
$function$
