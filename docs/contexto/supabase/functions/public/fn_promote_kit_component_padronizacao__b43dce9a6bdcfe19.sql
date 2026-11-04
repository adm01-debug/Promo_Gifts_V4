CREATE OR REPLACE FUNCTION public.fn_promote_kit_component_padronizacao(p_pad_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pad     kit_component_padronizacao%ROWTYPE;
  v_comp_id UUID;
BEGIN
  SELECT * INTO v_pad
  FROM kit_component_padronizacao
  WHERE id = p_pad_id AND padronizacao_status = 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'kit_component_padronizacao % não encontrada ou não está approved', p_pad_id;
  END IF;

  IF v_pad.kit_component_id IS NOT NULL THEN
    UPDATE product_kit_components SET
      shape_type            = COALESCE(v_pad.shape_type,        shape_type),
      weight_g              = COALESCE(v_pad.weight_g,          weight_g),
      length_mm             = COALESCE(v_pad.length_mm,         length_mm),
      width_mm              = COALESCE(v_pad.width_mm,          width_mm),
      height_mm             = COALESCE(v_pad.height_mm,         height_mm),
      diameter_mm           = COALESCE(v_pad.diameter_mm,       diameter_mm),
      circumference_mm      = COALESCE(v_pad.circumference_mm,  circumference_mm),
      pkg_ext_length_mm     = CASE WHEN v_pad.is_packaging
                                THEN COALESCE(v_pad.pkg_ext_length_mm, pkg_ext_length_mm)
                                ELSE pkg_ext_length_mm END,
      pkg_ext_width_mm      = CASE WHEN v_pad.is_packaging
                                THEN COALESCE(v_pad.pkg_ext_width_mm,  pkg_ext_width_mm)
                                ELSE pkg_ext_width_mm END,
      pkg_ext_height_mm     = CASE WHEN v_pad.is_packaging
                                THEN COALESCE(v_pad.pkg_ext_height_mm, pkg_ext_height_mm)
                                ELSE pkg_ext_height_mm END,
      pkg_int_length_mm     = CASE WHEN v_pad.is_packaging
                                THEN COALESCE(v_pad.pkg_int_length_mm, pkg_int_length_mm)
                                ELSE pkg_int_length_mm END,
      pkg_int_width_mm      = CASE WHEN v_pad.is_packaging
                                THEN COALESCE(v_pad.pkg_int_width_mm,  pkg_int_width_mm)
                                ELSE pkg_int_width_mm END,
      pkg_int_height_mm     = CASE WHEN v_pad.is_packaging
                                THEN COALESCE(v_pad.pkg_int_height_mm, pkg_int_height_mm)
                                ELSE pkg_int_height_mm END,
      pkg_int_diameter_mm   = CASE WHEN v_pad.is_packaging
                                THEN COALESCE(v_pad.pkg_int_diameter_mm, pkg_int_diameter_mm)
                                ELSE pkg_int_diameter_mm END,
      pkg_weight_g          = CASE WHEN v_pad.is_packaging
                                THEN COALESCE(v_pad.pkg_weight_g, pkg_weight_g)
                                ELSE pkg_weight_g END,
      pkg_material          = CASE WHEN v_pad.is_packaging
                                THEN COALESCE(v_pad.pkg_material, pkg_material)
                                ELSE pkg_material END,
      pkg_color             = CASE WHEN v_pad.is_packaging
                                THEN COALESCE(v_pad.pkg_color, pkg_color)
                                ELSE pkg_color END,
      pkg_finish            = CASE WHEN v_pad.is_packaging
                                THEN COALESCE(v_pad.pkg_finish, pkg_finish)
                                ELSE pkg_finish END,
      -- NOVO: cor do item (sempre carregada, NULL-safe)
      color                 = COALESCE(v_pad.color, color),
      component_product_id  = COALESCE(v_pad.component_product_id, component_product_id),
      component_type_code   = COALESCE(v_pad.component_type_code,  component_type_code),
      material_type_id      = COALESCE(v_pad.material_type_id,     material_type_id),
      enrichment_source     = v_pad.enrichment_source,
      enrichment_confidence = v_pad.enrichment_confidence,
      padronizacao_id       = p_pad_id,
      updated_at            = NOW()
    WHERE id = v_pad.kit_component_id
    RETURNING id INTO v_comp_id;

  ELSE
    INSERT INTO product_kit_components (
      kit_product_id, component_name, component_type_code, color,
      material_type_id, secondary_material_type_id, component_product_id,
      quantity, is_optional, is_packaging, allows_personalization,
      shape_type, weight_g, length_mm, width_mm, height_mm,
      diameter_mm, circumference_mm,
      pkg_ext_length_mm, pkg_ext_width_mm, pkg_ext_height_mm,
      pkg_int_length_mm, pkg_int_width_mm, pkg_int_height_mm,
      pkg_int_diameter_mm, pkg_weight_g,
      pkg_material, pkg_color, pkg_finish,
      enrichment_source, enrichment_confidence, padronizacao_id
    ) VALUES (
      v_pad.kit_product_id, v_pad.component_name, v_pad.component_type_code, v_pad.color,
      v_pad.material_type_id, v_pad.secondary_material_type_id, v_pad.component_product_id,
      COALESCE(v_pad.quantity, 1), FALSE, v_pad.is_packaging,
      COALESCE(v_pad.allows_personalization, TRUE),
      v_pad.shape_type, v_pad.weight_g, v_pad.length_mm, v_pad.width_mm, v_pad.height_mm,
      v_pad.diameter_mm, v_pad.circumference_mm,
      v_pad.pkg_ext_length_mm, v_pad.pkg_ext_width_mm, v_pad.pkg_ext_height_mm,
      v_pad.pkg_int_length_mm, v_pad.pkg_int_width_mm, v_pad.pkg_int_height_mm,
      v_pad.pkg_int_diameter_mm, v_pad.pkg_weight_g,
      v_pad.pkg_material, v_pad.pkg_color, v_pad.pkg_finish,
      v_pad.enrichment_source, v_pad.enrichment_confidence, p_pad_id
    )
    RETURNING id INTO v_comp_id;
  END IF;

  UPDATE kit_component_padronizacao
  SET padronizacao_status = 'promoted',
      kit_component_id    = v_comp_id,
      updated_at          = NOW()
  WHERE id = p_pad_id;

  UPDATE kit_component_enrichment_raw
  SET promoted_component_id = v_comp_id, updated_at = NOW()
  WHERE id = v_pad.raw_id;

  RETURN v_comp_id;
END;
$function$
