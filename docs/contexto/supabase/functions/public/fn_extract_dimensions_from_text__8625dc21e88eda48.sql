CREATE OR REPLACE FUNCTION public.fn_extract_dimensions_from_text(p_kit_component_id uuid, p_source_text text, p_extracted_data jsonb, p_confidence numeric DEFAULT 0.7)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pkc    product_kit_components%ROWTYPE;
  v_raw_id UUID;
BEGIN
  SELECT * INTO v_pkc FROM product_kit_components WHERE id = p_kit_component_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'component % not found', p_kit_component_id;
  END IF;

  INSERT INTO kit_component_enrichment_raw (
    kit_product_id, kit_component_id,
    raw_component_name, raw_component_type,
    raw_data, source, source_ref, source_confidence
  ) VALUES (
    v_pkc.kit_product_id, p_kit_component_id,
    v_pkc.component_name, v_pkc.component_type_code,
    p_extracted_data || jsonb_build_object(
      'component_name',      v_pkc.component_name,
      'component_type_code', v_pkc.component_type_code,
      'unit',                COALESCE(p_extracted_data->>'unit', 'mm'),
      'ai_source_text',      LEFT(p_source_text, 500),
      'is_packaging',        v_pkc.is_packaging,
      'allows_personalization', v_pkc.allows_personalization,
      'quantity',            v_pkc.quantity
    ),
    'ai_extraction',
    LEFT(p_source_text, 200),
    p_confidence
  ) RETURNING id INTO v_raw_id;

  RETURN v_raw_id;
END;
$function$
