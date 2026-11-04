CREATE OR REPLACE FUNCTION public.fn_asia_enrich_parent(p_supplier_id uuid, p_parent_reference text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_raw jsonb; v_asia jsonb; v_asia_prop jsonb; v_n int;
  v_h numeric; v_w numeric; v_l numeric;
  v_cap_raw text; v_cap_ml int;
BEGIN
  SELECT (SELECT raw_data FROM public.supplier_products_raw WHERE id = pv.raw_id)
    INTO v_raw
  FROM public.produtos_padronizacao_variantes pv
  WHERE pv.supplier_id = p_supplier_id
    AND pv.parent_reference = p_parent_reference
    AND pv.raw_id IS NOT NULL
  ORDER BY length((SELECT raw_data::text FROM public.supplier_products_raw WHERE id = pv.raw_id)) DESC NULLS LAST, pv.raw_id
  LIMIT 1;

  IF v_raw IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'sem_representante', 'parent', p_parent_reference);
  END IF;

  v_asia := public.fn_parse_asia_properties(
    COALESCE(v_raw->'propriedades', '{}'::jsonb),
    COALESCE(public.fn_safe_num(v_raw->>'altura'), 0),
    COALESCE(public.fn_safe_num(v_raw->>'largura'), 0),
    COALESCE(public.fn_safe_num(v_raw->>'comprimento'), 0),
    COALESCE(public.fn_safe_num(v_raw->>'peso'), 0),
    v_raw->>'origem_faturamento');

  v_asia_prop := public.fn_parse_asia_properties(
    COALESCE(v_raw->'propriedades', '{}'::jsonb), 0, 0, 0, 0, v_raw->>'origem_faturamento');

  -- PATCH: usar fn_safe_num para proteger casts diretos de dims
  v_h := COALESCE(public.fn_safe_num(v_asia_prop->>'height_cm'), public.fn_safe_num(v_asia->>'height_cm'));
  v_w := COALESCE(public.fn_safe_num(v_asia_prop->>'width_cm'),  public.fn_safe_num(v_asia->>'width_cm'));
  v_l := COALESCE(public.fn_safe_num(v_asia_prop->>'length_cm'), public.fn_safe_num(v_asia->>'length_cm'));

  -- PATCH: capacidade — tomar só 1ª parte antes de "/" para tratar "14,4/7,5L"
  v_cap_raw := lower(split_part(COALESCE(
     v_raw->'atributos'->'capacidade'->>'value',
     v_raw->'atributos'->'capacidade'->>'valor',
     v_raw->'atributos'->'volume-litros'->>'value',
     v_raw->'atributos'->'volume-litros'->>'valor',
     v_raw->'propriedades'->>'volume',
     v_raw->'propriedades'->>'capacidade',
     ''), '/', 1));   -- <-- PATCH: só parte antes de "/"

  v_cap_ml := CASE
     WHEN v_cap_raw ~ 'ml' THEN
       NULLIF(regexp_replace(v_cap_raw, '[^0-9]', '', 'g'), '')::int
     WHEN v_cap_raw ~ 'l'  THEN
       round(NULLIF(replace(regexp_replace(v_cap_raw, '[^0-9,\.]', '', 'g'), ',', '.'), '')::numeric * 1000)::int
     ELSE NULL END;

  UPDATE public.produtos_padronizacao SET
    description        = COALESCE(NULLIF(v_raw->>'descricao', ''), description),
    short_description  = COALESCE(LEFT(NULLIF(v_raw->>'descricao', ''), 300), short_description),
    images             = CASE WHEN jsonb_typeof(v_raw->'galeria') = 'array'
                               AND jsonb_array_length(v_raw->'galeria') > 0
                              THEN v_raw->'galeria' ELSE images END,
    height_cm          = COALESCE(v_h, height_cm),
    width_cm           = COALESCE(v_w, width_cm),
    length_cm          = COALESCE(v_l, length_cm),
    weight_g           = COALESCE((v_asia->>'weight_g')::int, weight_g),
    box_length_cm      = COALESCE(public.fn_safe_num(v_asia->>'box_length_cm'), box_length_cm),
    box_width_cm       = COALESCE(public.fn_safe_num(v_asia->>'box_width_cm'),  box_width_cm),
    box_height_cm      = COALESCE(public.fn_safe_num(v_asia->>'box_height_cm'), box_height_cm),
    box_weight_kg      = COALESCE(public.fn_safe_num(v_asia->>'box_weight_kg'), box_weight_kg),
    box_quantity       = COALESCE((v_asia->>'box_quantity')::int, box_quantity),
    packing_type       = COALESCE(v_asia->>'packing_type', packing_type),
    capacity_ml        = COALESCE(v_cap_ml, (v_asia->>'capacity_ml')::int, capacity_ml),
    dimensions_display = COALESCE(NULLIF(v_raw->'propriedades'->>'dimensao-do-produto', ''),
                                  NULLIF(v_raw->'propriedades'->>'dimensao-produto', ''), dimensions_display),
    updated_at = now()
  WHERE supplier_id = p_supplier_id AND supplier_reference = p_parent_reference;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object('success', v_n > 0, 'parent', p_parent_reference, 'rows', v_n,
                            'dims_cm', jsonb_build_object('h', v_h, 'w', v_w, 'l', v_l),
                            'capacity_ml', v_cap_ml);
END;
$function$
