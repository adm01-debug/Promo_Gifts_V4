CREATE OR REPLACE FUNCTION public.fn_extract_pkg_dims_from_bronze(p_limit integer DEFAULT 500)
 RETURNS TABLE(component_id uuid, component_name text, kit_ref text, raw_id uuid, resultado text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rec  RECORD;
  v_raw  RECORD;
  v_dims JSONB;
  v_raw_id UUID;
  v_pad_id UUID;
  v_ext_l  INTEGER; v_ext_w INTEGER; v_ext_h INTEGER;
  v_unit   TEXT;
BEGIN
  FOR v_rec IN
    SELECT
      pkc.id            AS comp_id,
      pkc.component_name,
      pkc.kit_product_id,
      p.supplier_reference AS kit_ref,
      p.supplier_id,
      s.code            AS supplier_code
    FROM product_kit_components pkc
    JOIN products p ON p.id = pkc.kit_product_id
    JOIN suppliers s ON s.id = p.supplier_id
    WHERE pkc.enrichment_status = 'missing'
      AND pkc.is_packaging = TRUE
      AND s.code IN ('STRICKER','SOMARCAS','ASIA','XBZ')
    LIMIT p_limit
  LOOP
    -- Buscar o raw_data do KIT no bronze
    SELECT raw_data INTO v_raw
    FROM supplier_products_raw spr
    WHERE spr.supplier_id = v_rec.supplier_id
      AND (
        spr.raw_data->>'ProdReference'  = v_rec.kit_ref OR  -- SPOT
        spr.raw_data->>'CodigoAmigavel' = v_rec.kit_ref OR  -- XBZ
        spr.raw_data->>'referencia'     = REPLACE(v_rec.kit_ref, 'ASIA-','') OR -- ASIA
        spr.raw_data->>'codigo'         = v_rec.kit_ref     -- SOMARCAS
      )
    LIMIT 1;

    IF NOT FOUND THEN
      component_id   := v_rec.comp_id;
      component_name := v_rec.component_name;
      kit_ref        := v_rec.kit_ref;
      raw_id         := NULL;
      resultado      := 'no_bronze_match';
      RETURN NEXT;
      CONTINUE;
    END IF;

    -- Extrair dimensões por fornecedor
    v_dims := NULL;
    v_ext_l := NULL; v_ext_w := NULL; v_ext_h := NULL;

    IF v_rec.supplier_code = 'STRICKER' THEN
      -- Box em MM direto
      v_ext_l := NULLIF(ROUND((v_raw.raw_data->>'BoxLengthMM')::NUMERIC * 1000), 0)::INTEGER; -- está em metros!
      v_ext_w := NULLIF(ROUND((v_raw.raw_data->>'BoxWidthMM')::NUMERIC * 1000), 0)::INTEGER;
      v_ext_h := NULLIF(ROUND((v_raw.raw_data->>'BoxHeightMM')::NUMERIC * 1000), 0)::INTEGER;
      v_unit := 'mm_from_spot_bronze';

    ELSIF v_rec.supplier_code IN ('SOMARCAS','ASIA') THEN
      -- Parsear texto "142x142x95 mm (AxLxP)" ou "235x230x93 mm (AxLxP)"
      DECLARE
        v_text TEXT := v_raw.raw_data->>'dimensoes_da_embalagem';
        v_match TEXT[];
      BEGIN
        v_match := REGEXP_MATCH(v_text,
          '(\d+)\s*[xX×]\s*(\d+)\s*[xX×]\s*(\d+)\s*(mm|cm)',
          'i'
        );
        IF v_match IS NOT NULL THEN
          v_unit := v_match[4];
          IF LOWER(v_unit) = 'cm' THEN
            v_ext_l := ROUND(v_match[1]::NUMERIC * 10)::INTEGER;
            v_ext_w := ROUND(v_match[2]::NUMERIC * 10)::INTEGER;
            v_ext_h := ROUND(v_match[3]::NUMERIC * 10)::INTEGER;
          ELSE
            v_ext_l := v_match[1]::INTEGER;
            v_ext_w := v_match[2]::INTEGER;
            v_ext_h := v_match[3]::INTEGER;
          END IF;
          v_unit := 'mm_from_bronze_text';
        END IF;
      END;

    ELSIF v_rec.supplier_code = 'XBZ' THEN
      -- XBZ: Altura/Largura/Profundidade em CM
      v_ext_l := NULLIF(ROUND((v_raw.raw_data->>'Profundidade')::NUMERIC * 10), 0)::INTEGER;
      v_ext_w := NULLIF(ROUND((v_raw.raw_data->>'Largura')::NUMERIC * 10), 0)::INTEGER;
      v_ext_h := NULLIF(ROUND((v_raw.raw_data->>'Altura')::NUMERIC * 10), 0)::INTEGER;
      v_unit := 'mm_from_xbz_bronze_cm';
    END IF;

    IF v_ext_l IS NULL AND v_ext_w IS NULL AND v_ext_h IS NULL THEN
      component_id := v_rec.comp_id; component_name := v_rec.component_name;
      kit_ref := v_rec.kit_ref; raw_id := NULL; resultado := 'no_dims_in_raw';
      RETURN NEXT;
      CONTINUE;
    END IF;

    v_dims := jsonb_build_object(
      'component_name',   v_rec.component_name,
      'is_packaging',     TRUE,
      'unit',             'mm',
      'pkg_ext_length_mm', v_ext_l,
      'pkg_ext_width_mm',  v_ext_w,
      'pkg_ext_height_mm', v_ext_h,
      'source_note',      v_unit,
      'kit_ref',          v_rec.kit_ref
    );

    INSERT INTO kit_component_enrichment_raw (
      kit_product_id, kit_component_id,
      raw_component_name, source, source_ref, source_confidence, raw_data
    ) VALUES (
      v_rec.kit_product_id, v_rec.comp_id,
      v_rec.component_name,
      'supplier_api', v_rec.kit_ref, 0.75,
      v_dims
    ) RETURNING id INTO v_raw_id;

    component_id   := v_rec.comp_id;
    component_name := v_rec.component_name;
    kit_ref        := v_rec.kit_ref;
    raw_id         := v_raw_id;
    resultado      := 'inserted:' || COALESCE(v_ext_l::TEXT,'?') || 'x' || COALESCE(v_ext_w::TEXT,'?') || 'x' || COALESCE(v_ext_h::TEXT,'?') || 'mm';
    RETURN NEXT;
  END LOOP;
END;
$function$
