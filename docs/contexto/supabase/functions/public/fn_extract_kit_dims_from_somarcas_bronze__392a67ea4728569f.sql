CREATE OR REPLACE FUNCTION public.fn_extract_kit_dims_from_somarcas_bronze(p_limit integer DEFAULT 500)
 RETURNS TABLE(component_id uuid, component_name text, dims_raw text, length_mm integer, width_mm integer, height_mm integer, weight_g integer, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rec   RECORD;
  v_dims  TEXT;
  v_peso  TEXT;
  v_3d    TEXT[]; v_2d TEXT[];
  v_len   NUMERIC; v_wid NUMERIC; v_hgt NUMERIC; v_wgt NUMERIC;
  v_unit  TEXT;
  v_is_pkg BOOLEAN;
  v_rid   UUID; v_pad_id UUID;
BEGIN
  FOR v_rec IN
    SELECT DISTINCT ON (pkc.id)
      pkc.id AS comp_id, pkc.kit_product_id,
      pkc.component_name, pkc.component_type_code, pkc.is_packaging,
      spr.raw_data->>'dimensoes_do_produto' AS dims_raw,
      spr.raw_data->>'peso_da_embalagem'    AS peso_raw
    FROM product_kit_components pkc
    JOIN products p ON p.id = pkc.kit_product_id
    JOIN suppliers s ON s.id = p.supplier_id AND s.name = 'Só Marcas'
    JOIN supplier_products_raw spr ON spr.product_id = p.id AND spr.supplier_id = s.id
    WHERE pkc.enrichment_status = 'missing'
      AND (spr.raw_data->>'dimensoes_do_produto' IS NOT NULL
           OR spr.raw_data->>'peso_da_embalagem' IS NOT NULL)
    ORDER BY pkc.id, spr.updated_at DESC
    LIMIT p_limit
  LOOP
    v_len:=NULL; v_wid:=NULL; v_hgt:=NULL; v_wgt:=NULL;
    v_dims := v_rec.dims_raw;
    v_peso := v_rec.peso_raw;
    v_is_pkg := v_rec.is_packaging;

    IF v_dims IS NOT NULL AND v_dims != '' AND v_dims !~ '^0x0' THEN
      -- Detectar unidade
      v_unit := CASE WHEN v_dims ~* 'mm' THEN 'mm' ELSE 'cm' END;
      -- Normalizar: vírgula → ponto
      v_dims := regexp_replace(v_dims, ',', '.', 'g');
      -- Remover unidades: cm, mm, metros
      v_dims := regexp_replace(v_dims, '(?:mm|cm|m)', '', 'gi');
      -- Tentar 3D
      v_3d := regexp_match(v_dims, '(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)');
      IF v_3d IS NOT NULL THEN
        v_len:=v_3d[1]::NUMERIC; v_wid:=v_3d[2]::NUMERIC; v_hgt:=v_3d[3]::NUMERIC;
        IF v_unit='cm' THEN v_len:=v_len*10; v_wid:=v_wid*10; v_hgt:=v_hgt*10; END IF;
      ELSE
        -- Tentar 2D
        v_2d := regexp_match(v_dims, '(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)');
        IF v_2d IS NOT NULL THEN
          v_len:=v_2d[1]::NUMERIC; v_hgt:=v_2d[2]::NUMERIC;
          IF v_unit='cm' THEN v_len:=v_len*10; v_hgt:=v_hgt*10; END IF;
        END IF;
      END IF;
    END IF;

    -- Peso: "147 g" | "0.250 kg" | "250g"
    IF v_peso IS NOT NULL AND v_peso ~ '\d' THEN
      IF v_peso ~* 'kg' THEN
        v_wgt := (regexp_match(regexp_replace(v_peso,',','.','g'), '(\d+(?:\.\d+)?)(?:\s*kg)'))[1]::NUMERIC * 1000;
      ELSE
        v_wgt := (regexp_match(v_peso, '(\d+(?:[.,]\d+)?)'))[1]::NUMERIC;
        IF v_wgt < 1 THEN v_wgt := v_wgt * 1000; END IF;
      END IF;
    END IF;

    IF COALESCE(v_len,0)>0 OR COALESCE(v_wgt,0)>0 THEN
      BEGIN
        v_rid := fn_extract_dimensions_from_text(
          v_rec.comp_id,
          'somarcas_dimensoes: '||COALESCE(v_rec.dims_raw,'')||' peso:'||COALESCE(v_rec.peso_raw,''),
          jsonb_strip_nulls(jsonb_build_object(
            'unit','mm',
            'length_mm', CASE WHEN COALESCE(v_len,0)>0 THEN v_len::INTEGER END,
            'width_mm',  CASE WHEN COALESCE(v_wid,0)>0 THEN v_wid::INTEGER END,
            'height_mm', CASE WHEN COALESCE(v_hgt,0)>0 THEN v_hgt::INTEGER END,
            'weight_g',  CASE WHEN COALESCE(v_wgt,0)>0 THEN v_wgt::INTEGER END,
            'shape_type','rectangular',
            'is_packaging',v_is_pkg,
            'source_field','dimensoes_do_produto'
          )),
          0.80
        );
        PERFORM fn_standardize_kit_component(v_rid);
        UPDATE kit_component_padronizacao SET padronizacao_status='approved',reviewed_at=NOW()
        WHERE raw_id=v_rid AND padronizacao_status='pending';
        SELECT id INTO v_pad_id FROM kit_component_padronizacao WHERE raw_id=v_rid AND padronizacao_status='approved' LIMIT 1;
        IF v_pad_id IS NOT NULL THEN PERFORM fn_promote_kit_component_padronizacao(v_pad_id); END IF;
        component_id:=v_rec.comp_id; component_name:=v_rec.component_name;
        dims_raw:=v_rec.dims_raw; length_mm:=v_len::INTEGER; width_mm:=v_wid::INTEGER;
        height_mm:=v_hgt::INTEGER; weight_g:=v_wgt::INTEGER; status:='extracted'; RETURN NEXT;
      EXCEPTION WHEN OTHERS THEN
        component_id:=v_rec.comp_id; component_name:=v_rec.component_name;
        dims_raw:=v_rec.dims_raw; length_mm:=NULL; width_mm:=NULL; height_mm:=NULL; weight_g:=NULL;
        status:='error: '||SQLERRM; RETURN NEXT;
      END;
    ELSE
      component_id:=v_rec.comp_id; component_name:=v_rec.component_name;
      dims_raw:=v_rec.dims_raw; length_mm:=NULL; width_mm:=NULL; height_mm:=NULL; weight_g:=NULL;
      status:='no_dims'; RETURN NEXT;
    END IF;
  END LOOP;
END;
$function$
