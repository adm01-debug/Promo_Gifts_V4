CREATE OR REPLACE FUNCTION public.fn_parse_kit_page_dimensions(p_kit_product_id uuid, p_page_html text, p_source_url text, p_supplier_code text, p_confidence numeric DEFAULT 0.75)
 RETURNS TABLE(component_id uuid, component_name text, dims_found text, raw_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_comp     RECORD;
  v_pattern  TEXT;
  v_matches  TEXT[];
  v_raw_id   UUID;
  v_len_mm   INTEGER; v_wid_mm INTEGER; v_hgt_mm INTEGER;
  v_unit     TEXT;
  v_found    TEXT;
BEGIN
  -- Para cada componente do kit
  FOR v_comp IN
    SELECT pkc.id, pkc.component_name, pkc.is_packaging, pkc.kit_product_id
    FROM product_kit_components pkc
    WHERE pkc.kit_product_id = p_kit_product_id
      AND pkc.enrichment_status = 'missing'
  LOOP
    v_found := NULL;
    v_len_mm := NULL; v_wid_mm := NULL; v_hgt_mm := NULL;

    -- Buscar o nome do componente no texto (case-insensitive, partial)
    -- Extrair dimensões na mesma linha/próxima linha
    -- Padrão XBZ: "Faca 40,3 cm x 2,4 cm" ou "Faca: 40.3 x 2.4 cm"
    -- Padrão SóMarcas: "Faca: 30 x 2 cm" ou "30x2x0,5 cm"
    v_matches := REGEXP_MATCH(p_page_html,
      '(?i)' || REGEXP_REPLACE(v_comp.component_name, '[^a-zA-Z0-9À-ú\s]', '.', 'g')
      || '[^0-9\n]{0,60}?(\d+[,.]?\d*)\s*(cm|mm)\s*[xXÃ—×]\s*(\d+[,.]?\d*)\s*(cm|mm)(?:\s*[xXÃ—×]\s*(\d+[,.]?\d*)\s*(cm|mm))?',
      'gi'
    );

    IF v_matches IS NULL THEN
      -- Tentar com apenas as primeiras palavras do nome
      DECLARE v_partial TEXT := (REGEXP_MATCH(v_comp.component_name, '^\S+'))[1];
      BEGIN
        IF v_partial IS NOT NULL AND LENGTH(v_partial) >= 4 THEN
          v_matches := REGEXP_MATCH(p_page_html,
            '(?i)' || v_partial
            || '[^0-9\n]{0,80}?(\d+[,.]?\d*)\s*(cm|mm)\s*[xXÃ—×]\s*(\d+[,.]?\d*)\s*(cm|mm)',
            'gi'
          );
        END IF;
      END;
    END IF;

    IF v_matches IS NOT NULL THEN
      v_unit := LOWER(v_matches[2]);

      IF v_unit = 'cm' THEN
        v_len_mm := ROUND(REPLACE(v_matches[1], ',', '.')::NUMERIC * 10)::INTEGER;
        v_wid_mm := ROUND(REPLACE(v_matches[3], ',', '.')::NUMERIC * 10)::INTEGER;
        IF v_matches[5] IS NOT NULL THEN
          v_hgt_mm := ROUND(REPLACE(v_matches[5], ',', '.')::NUMERIC * 10)::INTEGER;
        END IF;
      ELSE
        v_len_mm := ROUND(REPLACE(v_matches[1], ',', '.')::NUMERIC)::INTEGER;
        v_wid_mm := ROUND(REPLACE(v_matches[3], ',', '.')::NUMERIC)::INTEGER;
        IF v_matches[5] IS NOT NULL THEN
          v_hgt_mm := ROUND(REPLACE(v_matches[5], ',', '.')::NUMERIC)::INTEGER;
        END IF;
      END IF;

      v_found := v_matches[1] || v_unit || 'x' || v_matches[3] || v_unit;
    END IF;

    IF v_len_mm IS NULL AND v_wid_mm IS NULL THEN
      component_id := v_comp.id; component_name := v_comp.component_name;
      dims_found := 'not_found'; raw_id := NULL;
      RETURN NEXT; CONTINUE;
    END IF;

    INSERT INTO kit_component_enrichment_raw (
      kit_product_id, kit_component_id, raw_component_name,
      source, source_url, source_ref, source_confidence, raw_data
    ) VALUES (
      p_kit_product_id, v_comp.id, v_comp.component_name,
      'site_scraping', p_source_url, p_supplier_code, p_confidence,
      jsonb_strip_nulls(jsonb_build_object(
        'component_name',  v_comp.component_name,
        'unit',            'mm',
        'length_mm',       v_len_mm,
        'width_mm',        v_wid_mm,
        'height_mm',       v_hgt_mm,
        'is_packaging',    v_comp.is_packaging,
        'source_url',      p_source_url
      ))
    ) RETURNING id INTO v_raw_id;

    component_id := v_comp.id; component_name := v_comp.component_name;
    dims_found := v_found; raw_id := v_raw_id;
    RETURN NEXT;
  END LOOP;
END;
$function$
