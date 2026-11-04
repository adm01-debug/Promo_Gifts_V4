CREATE OR REPLACE FUNCTION public.fn_extract_kit_dims_from_xbz_bronze(p_limit integer DEFAULT 300)
 RETURNS TABLE(component_id uuid, component_name text, length_mm integer, width_mm integer, height_mm integer, weight_g integer, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_rec RECORD; v_rid UUID; v_pad_id UUID;
BEGIN
  FOR v_rec IN
    SELECT DISTINCT ON (pkc.id)
      pkc.id AS comp_id, pkc.kit_product_id, pkc.component_name, pkc.component_type_code, pkc.is_packaging,
      (spr.raw_data->>'Profundidade')::NUMERIC AS len,
      (spr.raw_data->>'Largura')::NUMERIC      AS wid,
      (spr.raw_data->>'Altura')::NUMERIC       AS hgt,
      (spr.raw_data->>'Peso')::NUMERIC         AS wgt
    FROM product_kit_components pkc
    JOIN products p ON p.id = pkc.kit_product_id
    JOIN suppliers s ON s.id = p.supplier_id AND s.code = 'XBZ'
    JOIN supplier_products_raw spr ON spr.product_id = p.id AND spr.supplier_id = s.id
    WHERE pkc.enrichment_status = 'missing'
      AND (
        (spr.raw_data->>'Profundidade')::NUMERIC > 0 OR
        (spr.raw_data->>'Largura')::NUMERIC > 0 OR
        (spr.raw_data->>'Altura')::NUMERIC > 0
      )
    ORDER BY pkc.id, spr.updated_at DESC
    LIMIT p_limit
  LOOP
    IF COALESCE(v_rec.len,0)>0 OR COALESCE(v_rec.wid,0)>0 OR COALESCE(v_rec.hgt,0)>0 THEN
      BEGIN
        v_rid := fn_extract_dimensions_from_text(
          v_rec.comp_id,
          'xbz_bronze: Profundidade='||v_rec.len||' Largura='||v_rec.wid||' Altura='||v_rec.hgt||' Peso='||v_rec.wgt,
          jsonb_strip_nulls(jsonb_build_object(
            'unit','mm',
            'length_mm',  CASE WHEN COALESCE(v_rec.len,0)>0 THEN v_rec.len::INTEGER END,
            'width_mm',   CASE WHEN COALESCE(v_rec.wid,0)>0 THEN v_rec.wid::INTEGER END,
            'height_mm',  CASE WHEN COALESCE(v_rec.hgt,0)>0 THEN v_rec.hgt::INTEGER END,
            'weight_g',   CASE WHEN COALESCE(v_rec.wgt,0)>0 THEN v_rec.wgt::INTEGER END,
            'is_packaging', v_rec.is_packaging,
            'shape_type', 'rectangular',
            'source_field','xbz_bronze'
          )), 0.80
        );
        PERFORM fn_standardize_kit_component(v_rid);
        UPDATE kit_component_padronizacao SET padronizacao_status='approved',reviewed_at=NOW()
        WHERE raw_id=v_rid AND padronizacao_status='pending';
        SELECT id INTO v_pad_id FROM kit_component_padronizacao WHERE raw_id=v_rid AND padronizacao_status='approved' LIMIT 1;
        IF v_pad_id IS NOT NULL THEN PERFORM fn_promote_kit_component_padronizacao(v_pad_id); END IF;
        component_id:=v_rec.comp_id; component_name:=v_rec.component_name;
        length_mm:=v_rec.len::INTEGER; width_mm:=v_rec.wid::INTEGER;
        height_mm:=v_rec.hgt::INTEGER; weight_g:=v_rec.wgt::INTEGER;
        status:='extracted'; RETURN NEXT;
      EXCEPTION WHEN OTHERS THEN
        component_id:=v_rec.comp_id; component_name:=v_rec.component_name;
        length_mm:=NULL; width_mm:=NULL; height_mm:=NULL; weight_g:=NULL;
        status:='error: '||SQLERRM; RETURN NEXT;
      END;
    END IF;
  END LOOP;
END;
$function$
