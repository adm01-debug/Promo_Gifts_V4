CREATE OR REPLACE FUNCTION public.fn_enrich_kits_daily()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_spot INTEGER := 0; v_somarcas INTEGER := 0; v_xbz INTEGER := 0;
  v_typical INTEGER := 0; v_material INTEGER := 0;
  v_missing_antes INTEGER; v_missing_depois INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_missing_antes FROM product_kit_components WHERE enrichment_status='missing';

  -- 1. Extrair dimensões do Bronze por fornecedor
  BEGIN
    SELECT COUNT(*) INTO v_spot FROM fn_extract_kit_dims_from_spot_bronze(500);
  EXCEPTION WHEN OTHERS THEN v_spot := -1; END;
  BEGIN
    SELECT COUNT(*) INTO v_somarcas FROM fn_extract_kit_dims_from_somarcas_bronze(500);
  EXCEPTION WHEN OTHERS THEN v_somarcas := -1; END;
  BEGIN
    SELECT COUNT(*) INTO v_xbz FROM fn_extract_kit_dims_from_xbz_bronze(500);
  EXCEPTION WHEN OTHERS THEN v_xbz := -1; END;

  -- 2. Aplicar dimensões típicas para os ainda 'missing'
  --    Inclui correção de shape_type para têxteis planos
  WITH upd AS (
    UPDATE product_kit_components pkc
    SET
      length_mm   = CASE WHEN td.shape != 'cylindrical' THEN td.length_mm ELSE pkc.length_mm END,
      width_mm    = CASE WHEN td.shape != 'cylindrical' THEN td.width_mm  ELSE pkc.width_mm  END,
      height_mm   = CASE WHEN td.shape IN ('rectangular','cylindrical')
                         THEN td.height_mm ELSE pkc.height_mm END,
      diameter_mm = CASE WHEN td.shape = 'cylindrical' THEN td.diameter_mm ELSE pkc.diameter_mm END,
      -- Correção: têxteis planos (AVENTAL, TOALHA, ALMOFADA, etc.) → 'flat'
      shape_type  = CASE
                      WHEN pkc.component_type_code IN ('AVENTAL','TOALHA','FAIXA_ELASTICA',
                                                       'MASCARA_DORMIR','CAPA_CHUVA','ALMOFADA',
                                                       'LUVA','MOUSE_PAD','ECOBAG','CAMISETA')
                      THEN 'flat'
                      ELSE td.shape
                    END,
      weight_g    = COALESCE(pkc.weight_g, td.weight_g_typical),
      enrichment_confidence = 0.40,
      enrichment_source = 'estimated_typical_dims',
      pkg_ext_length_mm = CASE WHEN pkc.is_packaging AND td.shape='rectangular'
        THEN COALESCE(pkc.pkg_ext_length_mm, td.length_mm) ELSE pkc.pkg_ext_length_mm END,
      pkg_ext_width_mm  = CASE WHEN pkc.is_packaging AND td.shape='rectangular'
        THEN COALESCE(pkc.pkg_ext_width_mm, td.width_mm) ELSE pkc.pkg_ext_width_mm END,
      pkg_ext_height_mm = CASE WHEN pkc.is_packaging AND td.shape='rectangular'
        THEN COALESCE(pkc.pkg_ext_height_mm, td.height_mm) ELSE pkc.pkg_ext_height_mm END
    FROM kit_typical_dims td
    WHERE pkc.enrichment_status = 'missing'
      AND pkc.component_type_code = td.type_code
      AND pkc.length_mm IS NULL AND pkc.diameter_mm IS NULL
    RETURNING pkc.id
  ) SELECT COUNT(*) INTO v_typical FROM upd;

  -- 3. Propagar material_type_id para componentes que não têm
  --    (inclui novos que entraram via fn_extract_kit_dims_from_*_bronze)
  WITH mat AS (
    UPDATE product_kit_components pkc
    SET material_type_id = kct.default_material_type_id,
        secondary_material_type_id = COALESCE(pkc.secondary_material_type_id, kct.secondary_material_type_id),
        updated_at = NOW()
    FROM kit_component_types kct
    WHERE pkc.component_type_code = kct.code
      AND pkc.material_type_id IS NULL
      AND kct.default_material_type_id IS NOT NULL
    RETURNING pkc.id
  ) SELECT COUNT(*) INTO v_material FROM mat;

  SELECT COUNT(*) INTO v_missing_depois FROM product_kit_components WHERE enrichment_status='missing';

  RETURN jsonb_build_object(
    'spot_rows', v_spot, 'somarcas_rows', v_somarcas, 'xbz_rows', v_xbz,
    'typical_applied', v_typical, 'material_propagated', v_material,
    'missing_antes', v_missing_antes, 'missing_depois', v_missing_depois,
    'ts', NOW()
  );
END;
$function$
