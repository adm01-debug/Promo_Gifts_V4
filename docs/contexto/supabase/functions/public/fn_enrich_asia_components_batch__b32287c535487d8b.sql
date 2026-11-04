CREATE OR REPLACE FUNCTION public.fn_enrich_asia_components_batch(p_items jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item   JSONB;
  v_rid    UUID;
  v_pad_id UUID;
  v_count  INTEGER := 0;
BEGIN
  FOR v_item IN SELECT jsonb_array_elements(p_items)
  LOOP
    BEGIN
      v_rid := fn_extract_dimensions_from_text(
        (v_item->>'component_id')::UUID,
        'asia_api:' || COALESCE(v_item->>'source',''),
        jsonb_strip_nulls(jsonb_build_object(
          'unit',        'mm',
          'length_mm',   (v_item->>'length_mm')::INTEGER,
          'width_mm',    (v_item->>'width_mm')::INTEGER,
          'height_mm',   (v_item->>'height_mm')::INTEGER,
          'diameter_mm', (v_item->>'diameter_mm')::INTEGER,
          'weight_g',    (v_item->>'weight_g')::INTEGER,
          'shape_type',  COALESCE(v_item->>'shape_type','rectangular'),
          'is_packaging', (v_item->>'is_packaging')::BOOLEAN,
          'source_field', 'asia_api'
        )),
        0.85
      );
      IF v_rid IS NOT NULL THEN
        PERFORM fn_standardize_kit_component(v_rid);
        UPDATE kit_component_padronizacao
        SET padronizacao_status='approved', reviewed_at=NOW()
        WHERE raw_id=v_rid AND padronizacao_status='pending';
        SELECT id INTO v_pad_id FROM kit_component_padronizacao
        WHERE raw_id=v_rid AND padronizacao_status='approved' LIMIT 1;
        IF v_pad_id IS NOT NULL THEN
          PERFORM fn_promote_kit_component_padronizacao(v_pad_id);
          v_count := v_count + 1;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
  RETURN v_count;
END;
$function$
