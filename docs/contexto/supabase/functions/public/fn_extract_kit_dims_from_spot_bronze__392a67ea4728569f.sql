CREATE OR REPLACE FUNCTION public.fn_extract_kit_dims_from_spot_bronze(p_limit integer DEFAULT 500)
 RETURNS TABLE(component_id uuid, component_name text, component_type text, matched_segment text, length_mm integer, width_mm integer, height_mm integer, diameter_mm integer, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rec   RECORD;
  v_segs  TEXT[];
  v_seg   TEXT;
  v_match TEXT;
  v_len   NUMERIC; v_wid NUMERIC; v_hgt NUMERIC; v_dia NUMERIC;
  v_3d    TEXT[]; v_2d TEXT[]; v_dia_t TEXT[];
  v_is_pkg BOOLEAN;
  v_rid   UUID; v_pad_id UUID;
BEGIN
  FOR v_rec IN
    SELECT DISTINCT ON (pkc.id)
      pkc.id          AS comp_id,
      pkc.kit_product_id,
      pkc.component_name,
      pkc.component_type_code,
      pkc.is_packaging,
      spr.raw_data->>'CombinedSizes' AS combined
    FROM product_kit_components pkc
    JOIN products p ON p.id = pkc.kit_product_id
    JOIN suppliers s ON s.id = p.supplier_id AND s.name = 'Spot | Stricker'
    JOIN supplier_products_raw spr ON spr.product_id = p.id AND spr.supplier_id = s.id
    WHERE pkc.enrichment_status = 'missing'
      AND spr.raw_data->>'CombinedSizes' IS NOT NULL
      AND spr.raw_data->>'CombinedSizes' != ''
    ORDER BY pkc.id, spr.updated_at DESC
    LIMIT p_limit
  LOOP
    v_match := NULL; v_len := NULL; v_wid := NULL; v_hgt := NULL; v_dia := NULL;
    v_segs  := string_to_array(v_rec.combined, ' | ');
    v_is_pkg := v_rec.component_type_code IN ('CAIXA','NECESSAIRE','ESTOJO_NYLON',
      'ESTOJO_ALUMINIO','ESTOJO_BAMBU','ESTOJO_PU','ESTOJO');

    -- FASE 1: match por label no segmento
    FOREACH v_seg IN ARRAY v_segs LOOP
      IF v_match IS NOT NULL THEN CONTINUE; END IF;
      IF  (v_rec.component_type_code = 'TABUA'        AND v_seg ~* '(?:tábua|tabua)')
       OR (v_rec.component_type_code IN ('FACA','FACA_TRINCHAR') AND v_seg ~* '(?:faca|talher|chaira|pão|queijo|chefe|japonesa|legumes|boning|média|pequena|trinchar)')
       OR (v_rec.component_type_code = 'GARFO'        AND v_seg ~* '(?:garfo|fork)')
       OR (v_rec.component_type_code = 'COLHER'       AND v_seg ~* '(?:colher|spoon|colh)')
       OR (v_rec.component_type_code = 'CHAIRA'       AND v_seg ~* '(?:chaira|steel|afiador)')
       OR (v_rec.component_type_code = 'SACA_ROLHAS'  AND v_seg ~* '(?:saca|rolha|abridor|sommelier)')
       OR (v_rec.component_type_code IN ('CAIXA','NECESSAIRE') AND v_seg ~* '(?:caixa|estojo|box|almofad|presente|kraft|bambu|lata|cortiça|hermét|garrafa|cartão)')
       OR (v_rec.component_type_code = 'ESTOJO_NYLON' AND v_seg ~* '(?:estojo|mala|bolsa|nylon|210d|pouch|algodão|190t|eva|pu)')
       OR (v_rec.component_type_code = 'ESTOJO_ALUMINIO' AND v_seg ~* '(?:estojo|alumin)')
       OR (v_rec.component_type_code = 'CHAVEIRO'     AND v_seg ~* '(?:chaveiro|keychain)')
       OR (v_rec.component_type_code = 'PORTA_CARTAO' AND v_seg ~* '(?:porta.?cart|card)')
       OR (v_rec.component_type_code = 'CANETA'       AND v_seg ~* '(?:esfer|roller|caneta|pen|lápis|lapiseira|ponteira|touch)')
       OR (v_rec.component_type_code = 'CADERNO'      AND v_seg ~* '(?:caderno|notebook|bloco)')
       OR (v_rec.component_type_code = 'ALMOFADA'     AND v_seg ~* '(?:almofada)')
       THEN v_match := v_seg;
      END IF;
    END LOOP;

    -- FASE 2: fallback primeiro segmento sem label
    IF v_match IS NULL AND array_length(v_segs,1) >= 1 THEN
      IF v_segs[1] !~ '^[A-ZÀ-ú][A-Za-zÀ-ú ]+:' AND v_segs[1] ~ '\d+' THEN
        v_match := v_segs[1];
      END IF;
    END IF;

    -- EXTRAIR DIMENSÕES do segmento
    IF v_match IS NOT NULL THEN
      -- ø (cilíndrico)
      v_dia_t := regexp_match(regexp_replace(v_match,',','.','g'),
        'ø\s*(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)');
      IF v_dia_t IS NOT NULL THEN
        v_dia := v_dia_t[1]::NUMERIC; v_hgt := v_dia_t[2]::NUMERIC;
        IF v_dia < 20 THEN v_dia := v_dia*10; END IF;
        IF v_hgt < 20 THEN v_hgt := v_hgt*10; END IF;
      ELSE
        -- 3D
        v_3d := regexp_match(regexp_replace(v_match,',','.','g'),
          '(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)');
        IF v_3d IS NOT NULL THEN
          v_len := v_3d[1]::NUMERIC; v_wid := v_3d[2]::NUMERIC; v_hgt := v_3d[3]::NUMERIC;
          IF v_len<30 AND v_wid<30 AND v_hgt<30 THEN v_len:=v_len*10; v_wid:=v_wid*10; v_hgt:=v_hgt*10; END IF;
        ELSE
          -- 2D
          v_2d := regexp_match(regexp_replace(v_match,',','.','g'),
            '(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)');
          IF v_2d IS NOT NULL THEN
            v_len := v_2d[1]::NUMERIC; v_hgt := v_2d[2]::NUMERIC;
            IF v_len<30 AND v_hgt<30 THEN v_len:=v_len*10; v_hgt:=v_hgt*10; END IF;
          END IF;
        END IF;
      END IF;
    END IF;

    -- COMITAR se tem pelo menos 1 dimensão
    IF COALESCE(v_len,0)>0 OR COALESCE(v_dia,0)>0 THEN
      BEGIN
        v_rid := fn_extract_dimensions_from_text(
          v_rec.comp_id,
          'spot_combined_sizes: '||COALESCE(v_rec.combined,''),
          jsonb_strip_nulls(jsonb_build_object(
            'unit','mm',
            'length_mm',   CASE WHEN COALESCE(v_len,0)>0 THEN v_len::INTEGER END,
            'width_mm',    CASE WHEN COALESCE(v_wid,0)>0 THEN v_wid::INTEGER END,
            'height_mm',   CASE WHEN COALESCE(v_hgt,0)>0 THEN v_hgt::INTEGER END,
            'diameter_mm', CASE WHEN COALESCE(v_dia,0)>0 THEN v_dia::INTEGER END,
            'shape_type',  CASE WHEN COALESCE(v_dia,0)>0 THEN 'cylindrical' ELSE 'rectangular' END,
            'is_packaging', v_is_pkg,
            'source_field','CombinedSizes'
          )),
          0.85
        );
        PERFORM fn_standardize_kit_component(v_rid);
        UPDATE kit_component_padronizacao SET padronizacao_status='approved',reviewed_at=NOW()
        WHERE raw_id=v_rid AND padronizacao_status='pending';
        SELECT id INTO v_pad_id FROM kit_component_padronizacao WHERE raw_id=v_rid AND padronizacao_status='approved' LIMIT 1;
        IF v_pad_id IS NOT NULL THEN PERFORM fn_promote_kit_component_padronizacao(v_pad_id); END IF;
        component_id:=v_rec.comp_id; component_name:=v_rec.component_name; component_type:=v_rec.component_type_code;
        matched_segment:=v_match; length_mm:=v_len::INTEGER; width_mm:=v_wid::INTEGER;
        height_mm:=v_hgt::INTEGER; diameter_mm:=v_dia::INTEGER; status:='extracted'; RETURN NEXT;
      EXCEPTION WHEN OTHERS THEN
        component_id:=v_rec.comp_id; component_name:=v_rec.component_name; component_type:=v_rec.component_type_code;
        matched_segment:=v_match; length_mm:=NULL; width_mm:=NULL; height_mm:=NULL; diameter_mm:=NULL;
        status:='error: '||SQLERRM; RETURN NEXT;
      END;
    ELSE
      component_id:=v_rec.comp_id; component_name:=v_rec.component_name; component_type:=v_rec.component_type_code;
      matched_segment:=v_match; length_mm:=NULL; width_mm:=NULL; height_mm:=NULL; diameter_mm:=NULL;
      status:='no_dims'; RETURN NEXT;
    END IF;
  END LOOP;
END;
$function$
