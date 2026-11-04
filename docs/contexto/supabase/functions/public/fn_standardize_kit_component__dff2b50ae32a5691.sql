CREATE OR REPLACE FUNCTION public.fn_standardize_kit_component(p_raw_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_raw          kit_component_enrichment_raw%ROWTYPE;
  v_pad_id       UUID;
  v_rd           JSONB;
  v_factor       NUMERIC;
  v_shape        VARCHAR(30);
  v_is_pkg       BOOLEAN;
  v_comp_type    VARCHAR(30);
  v_color        VARCHAR(50);
  v_len          INTEGER; v_wid INTEGER; v_hgt INTEGER;
  v_diam         INTEGER; v_wgt INTEGER;
BEGIN
  SELECT * INTO v_raw FROM kit_component_enrichment_raw WHERE id = p_raw_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'kit_component_enrichment_raw % não encontrado', p_raw_id;
  END IF;
  IF v_raw.processed THEN
    RETURN v_raw.promoted_padronizacao_id;
  END IF;

  v_rd     := v_raw.raw_data;
  v_factor := CASE WHEN (v_rd->>'unit') = 'cm' THEN 10 ELSE 1 END;

  v_len  := NULLIF(ROUND(v_factor * COALESCE(
    (v_rd->>'length_mm')::NUMERIC,(v_rd->>'length')::NUMERIC,
    (v_rd->>'profundidade_mm')::NUMERIC,(v_rd->>'profundidade')::NUMERIC,
    (v_rd->>'comprimento_mm')::NUMERIC,(v_rd->>'comprimento')::NUMERIC)), 0)::INTEGER;
  v_wid  := NULLIF(ROUND(v_factor * COALESCE(
    (v_rd->>'width_mm')::NUMERIC,(v_rd->>'width')::NUMERIC,
    (v_rd->>'largura_mm')::NUMERIC,(v_rd->>'largura')::NUMERIC)), 0)::INTEGER;
  v_hgt  := NULLIF(ROUND(v_factor * COALESCE(
    (v_rd->>'height_mm')::NUMERIC,(v_rd->>'height')::NUMERIC,
    (v_rd->>'altura_mm')::NUMERIC,(v_rd->>'altura')::NUMERIC)), 0)::INTEGER;
  v_diam := NULLIF(ROUND(v_factor * COALESCE(
    (v_rd->>'diameter_mm')::NUMERIC,(v_rd->>'diameter')::NUMERIC,
    (v_rd->>'diametro_mm')::NUMERIC,(v_rd->>'diametro')::NUMERIC)), 0)::INTEGER;
  v_wgt  := NULLIF(COALESCE(
    (v_rd->>'weight_g')::NUMERIC,(v_rd->>'peso_g')::NUMERIC,
    (v_rd->>'peso')::NUMERIC), 0)::INTEGER;

  -- NOVO: cor do item (EN/PT, trim, vazio→NULL, truncado a 50)
  v_color := LEFT(NULLIF(TRIM(COALESCE(
    v_rd->>'color', v_rd->>'cor', v_rd->>'colour', v_rd->>'cor_item')),''),50);

  v_comp_type := LEFT(COALESCE(v_rd->>'component_type_code', v_raw.raw_component_type), 30);

  -- REGRA SHAPE (v2: têxteis planos classificados como 'flat')
  v_shape := CASE
    WHEN v_diam IS NOT NULL                                          THEN 'cylindrical'
    WHEN v_comp_type IN ('AVENTAL','TOALHA','FAIXA_ELASTICA',
                         'MASCARA_DORMIR','CAPA_CHUVA','ALMOFADA',
                         'LUVA','MOUSE_PAD')                        THEN 'flat'
    WHEN v_comp_type IN ('BOLSA','MOCHILA','SACOLA','ECOBAG',
                         'NECESSAIRE','BOLSA_TERMICA')               THEN 'irregular'
    WHEN v_hgt IS NOT NULL AND v_hgt < 10                            THEN 'flat'
    ELSE 'rectangular'
  END;

  v_is_pkg := COALESCE(
    (v_rd->>'is_packaging')::BOOLEAN,
    v_comp_type IN ('CAIXA','ESTOJO_NYLON','NECESSAIRE','MOCHILA','BOLSA_PRESENTE',
                    'ESTOJO_ALUMINIO','ESTOJO_BAMBU','ESTOJO_PU','ESTOJO',
                    'ESTOJO_COURO','ESTOJO_MADEIRA','ESTOJO_KRAFT','ESTOJO_CORTICA',
                    'ESTOJO_TNT','CAIXA_XADREZ')
  );

  INSERT INTO kit_component_padronizacao (
    kit_product_id, kit_component_id, raw_id,
    component_name, component_type_code, color, shape_type,
    length_mm, width_mm, height_mm, diameter_mm, weight_g,
    is_packaging,
    pkg_ext_length_mm, pkg_ext_width_mm, pkg_ext_height_mm,
    pkg_int_length_mm, pkg_int_width_mm, pkg_int_height_mm,
    pkg_int_diameter_mm, pkg_weight_g,
    pkg_material, pkg_color, pkg_finish, pkg_type_code,
    allows_personalization, quantity,
    enrichment_source, enrichment_confidence,
    padronizacao_status, notes
  ) VALUES (
    v_raw.kit_product_id, v_raw.kit_component_id, p_raw_id,
    COALESCE(v_rd->>'component_name', v_raw.raw_component_name, 'Componente sem nome'),
    v_comp_type, v_color, v_shape,
    v_len, v_wid, v_hgt, v_diam, v_wgt,
    v_is_pkg,
    CASE WHEN v_is_pkg THEN NULLIF(ROUND(v_factor*(v_rd->>'pkg_ext_length_mm')::NUMERIC),0)::INTEGER END,
    CASE WHEN v_is_pkg THEN NULLIF(ROUND(v_factor*(v_rd->>'pkg_ext_width_mm')::NUMERIC),0)::INTEGER  END,
    CASE WHEN v_is_pkg THEN NULLIF(ROUND(v_factor*(v_rd->>'pkg_ext_height_mm')::NUMERIC),0)::INTEGER END,
    CASE WHEN v_is_pkg THEN NULLIF(ROUND(v_factor*(v_rd->>'pkg_int_length_mm')::NUMERIC),0)::INTEGER END,
    CASE WHEN v_is_pkg THEN NULLIF(ROUND(v_factor*(v_rd->>'pkg_int_width_mm')::NUMERIC),0)::INTEGER  END,
    CASE WHEN v_is_pkg THEN NULLIF(ROUND(v_factor*(v_rd->>'pkg_int_height_mm')::NUMERIC),0)::INTEGER END,
    CASE WHEN v_is_pkg THEN NULLIF(ROUND(v_factor*(v_rd->>'pkg_int_diameter_mm')::NUMERIC),0)::INTEGER END,
    CASE WHEN v_is_pkg THEN NULLIF((v_rd->>'pkg_weight_g')::INTEGER,0) END,
    CASE WHEN v_is_pkg THEN v_rd->>'pkg_material' END,
    CASE WHEN v_is_pkg THEN v_rd->>'pkg_color' END,
    CASE WHEN v_is_pkg THEN v_rd->>'pkg_finish' END,
    CASE WHEN v_is_pkg THEN LEFT(v_comp_type,30) END,
    COALESCE((v_rd->>'allows_personalization')::BOOLEAN, TRUE),
    COALESCE((v_rd->>'quantity')::INTEGER, 1),
    v_raw.source::VARCHAR(50), v_raw.source_confidence,
    'pending', v_rd->>'notes'
  )
  RETURNING id INTO v_pad_id;

  UPDATE kit_component_enrichment_raw
  SET processed = TRUE, processed_at = NOW(),
      promoted_padronizacao_id = v_pad_id, updated_at = NOW()
  WHERE id = p_raw_id;

  RETURN v_pad_id;
EXCEPTION WHEN OTHERS THEN
  UPDATE kit_component_enrichment_raw
  SET process_errors = jsonb_build_object('error', SQLERRM, 'at', NOW()), updated_at = NOW()
  WHERE id = p_raw_id;
  RAISE;
END;
$function$
