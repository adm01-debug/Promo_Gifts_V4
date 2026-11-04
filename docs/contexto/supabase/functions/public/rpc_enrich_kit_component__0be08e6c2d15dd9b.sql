CREATE OR REPLACE FUNCTION public.rpc_enrich_kit_component(p_kit_component_id uuid, p_source character varying DEFAULT 'manual_admin'::character varying, p_shape_type character varying DEFAULT NULL::character varying, p_length_mm integer DEFAULT NULL::integer, p_width_mm integer DEFAULT NULL::integer, p_height_mm integer DEFAULT NULL::integer, p_diameter_mm integer DEFAULT NULL::integer, p_weight_g integer DEFAULT NULL::integer, p_pkg_ext_length_mm integer DEFAULT NULL::integer, p_pkg_ext_width_mm integer DEFAULT NULL::integer, p_pkg_ext_height_mm integer DEFAULT NULL::integer, p_pkg_int_length_mm integer DEFAULT NULL::integer, p_pkg_int_width_mm integer DEFAULT NULL::integer, p_pkg_int_height_mm integer DEFAULT NULL::integer, p_pkg_material character varying DEFAULT NULL::character varying, p_pkg_color character varying DEFAULT NULL::character varying, p_pkg_finish character varying DEFAULT NULL::character varying, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pkc        product_kit_components%ROWTYPE;
  v_raw_id     UUID;
  v_pad_id     UUID;
  v_comp_id    UUID;
BEGIN
  -- Verificar que componente existe
  SELECT * INTO v_pkc FROM product_kit_components WHERE id = p_kit_component_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'error', 'component not found');
  END IF;

  -- Inserir no bronze
  INSERT INTO kit_component_enrichment_raw (
    kit_product_id, kit_component_id,
    raw_component_name, raw_component_type,
    raw_data, source, source_confidence
  ) VALUES (
    v_pkc.kit_product_id, p_kit_component_id,
    v_pkc.component_name, v_pkc.component_type_code,
    jsonb_strip_nulls(jsonb_build_object(
      'component_name',         v_pkc.component_name,
      'component_type_code',    v_pkc.component_type_code,
      'unit',                   'mm',
      'shape_type',             p_shape_type,
      'length_mm',              p_length_mm,
      'width_mm',               p_width_mm,
      'height_mm',              p_height_mm,
      'diameter_mm',            p_diameter_mm,
      'weight_g',               p_weight_g,
      'is_packaging',           v_pkc.is_packaging,
      'pkg_ext_length_mm',      p_pkg_ext_length_mm,
      'pkg_ext_width_mm',       p_pkg_ext_width_mm,
      'pkg_ext_height_mm',      p_pkg_ext_height_mm,
      'pkg_int_length_mm',      p_pkg_int_length_mm,
      'pkg_int_width_mm',       p_pkg_int_width_mm,
      'pkg_int_height_mm',      p_pkg_int_height_mm,
      'pkg_material',           p_pkg_material,
      'pkg_color',              p_pkg_color,
      'pkg_finish',             p_pkg_finish,
      'notes',                  p_notes,
      'allows_personalization', v_pkc.allows_personalization,
      'quantity',               v_pkc.quantity
    )),
    p_source, 1.000  -- manual = confiança máxima
  ) RETURNING id INTO v_raw_id;

  -- Bronze → Prata (auto-padroniza)
  v_pad_id := fn_standardize_kit_component(v_raw_id);

  -- Auto-approve e promove (input manual = confiança total)
  UPDATE kit_component_padronizacao
  SET padronizacao_status = 'approved', reviewed_at = NOW()
  WHERE id = v_pad_id;

  v_comp_id := fn_promote_kit_component_padronizacao(v_pad_id);

  RETURN jsonb_build_object(
    'ok',           TRUE,
    'raw_id',       v_raw_id,
    'pad_id',       v_pad_id,
    'component_id', v_comp_id,
    'enrichment_status', (SELECT enrichment_status FROM product_kit_components WHERE id = v_comp_id)
  );
END;
$function$
