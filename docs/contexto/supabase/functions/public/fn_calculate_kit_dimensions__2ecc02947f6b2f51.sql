CREATE OR REPLACE FUNCTION public.fn_calculate_kit_dimensions(p_kit_id uuid)
 RETURNS TABLE(total_components integer, total_pieces integer, total_weight_g integer, packaging_ext_length_mm integer, packaging_ext_width_mm integer, packaging_ext_height_mm integer, packaging_int_length_mm integer, packaging_int_width_mm integer, packaging_int_height_mm integer, packaging_material character varying, packaging_type character varying, materials_list text[], enrichment_complete boolean, enrichment_pct numeric)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER                                        AS total_components,
    SUM(pkc.quantity)::INTEGER                              AS total_pieces,
    SUM(COALESCE(pkc.weight_g,0) * pkc.quantity)::INTEGER   AS total_weight_g,
    MAX(CASE WHEN pkc.is_packaging
          THEN COALESCE(pkc.pkg_ext_length_mm, pkc.length_mm) END)::INTEGER,
    MAX(CASE WHEN pkc.is_packaging
          THEN COALESCE(pkc.pkg_ext_width_mm,  pkc.width_mm)  END)::INTEGER,
    MAX(CASE WHEN pkc.is_packaging
          THEN COALESCE(pkc.pkg_ext_height_mm, pkc.height_mm) END)::INTEGER,
    MAX(CASE WHEN pkc.is_packaging THEN pkc.pkg_int_length_mm END)::INTEGER,
    MAX(CASE WHEN pkc.is_packaging THEN pkc.pkg_int_width_mm  END)::INTEGER,
    MAX(CASE WHEN pkc.is_packaging THEN pkc.pkg_int_height_mm END)::INTEGER,
    MAX(CASE WHEN pkc.is_packaging THEN pkc.pkg_material      END)::VARCHAR,
    MAX(CASE WHEN pkc.is_packaging THEN pkc.component_name    END)::VARCHAR,
    ARRAY_AGG(DISTINCT mt.name)::TEXT[],
    BOOL_AND(pkc.enrichment_status = 'complete'),
    ROUND(
      COUNT(*) FILTER (WHERE pkc.enrichment_status = 'complete')::NUMERIC
      / NULLIF(COUNT(*),0) * 100, 1
    )
  FROM product_kit_components pkc
  LEFT JOIN material_types mt ON mt.id = pkc.material_type_id
  WHERE pkc.kit_product_id = p_kit_id
  GROUP BY pkc.kit_product_id;
END;
$function$
