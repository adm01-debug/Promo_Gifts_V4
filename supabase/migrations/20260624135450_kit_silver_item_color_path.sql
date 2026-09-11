-- ============================================================
-- MELHORIA 1: Caminho estrutural da COR de item (prata → gold)
-- Atômico: coluna na prata + wiring em standardize e promote
-- ============================================================

-- 1) Coluna de cor do ITEM na PRATA (espelha o contrato da gold: varchar(50))
ALTER TABLE public.kit_component_padronizacao
  ADD COLUMN IF NOT EXISTS color VARCHAR(50);

COMMENT ON COLUMN public.kit_component_padronizacao.color IS
  'Cor do ITEM (distinta de pkg_color, que é da embalagem). Free-text padronizável. '
  'Alimenta product_kit_components.color via fn_promote_kit_component_padronizacao. NULL = desconhecida.';

-- 2) BRONZE → PRATA: extrair cor do raw_data (preserva search_path e demais lógicas)
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
$function$;

-- 3) PRATA → GOLD: propagar color (UPDATE e INSERT)
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
$function$;;
