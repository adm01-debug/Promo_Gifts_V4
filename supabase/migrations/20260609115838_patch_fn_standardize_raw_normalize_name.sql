
CREATE OR REPLACE FUNCTION public.fn_standardize_raw(p_raw_id uuid, p_override_reference text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  r          public.supplier_products_raw%ROWTYPE;
  m          RECORD;
  v_val      text; v_tx text; v_path text;
  v_assigns  jsonb := '{}'::jsonb;
  v_errs     jsonb := '[]'::jsonb;
  v_ncm text; v_ncm_raw text;
  v_pad_id uuid; v_ref text;
  v_status public.produtos_padronizacao_status;
  v_tags jsonb; v_materials jsonb; v_meta text[]; v_arr jsonb;
  v_ncm_ipi  numeric;
  v_cols text[] := ARRAY[
    'name','description','short_description','cost_price','suggested_price','stock_quantity',
    'primary_image_url','images','ncm_code','weight_g','height_cm','width_cm','length_cm',
    'dimensions_display','box_length_cm','box_width_cm','box_height_cm','box_weight_kg',
    'box_volume_cm3','box_quantity','box_inner_quantity','brand','packing_type','repacking_type',
    'capacities','capacity_ml','min_quantity','ipi_rate','engraving_type','is_active',
    'product_type','origin_country','combined_sizes','box_image',
    'is_textil','is_stockout','is_online_exclusive','is_new','has_colors','has_sizes',
    'allows_personalization','tags','materials','meta_keywords'
  ];
BEGIN
  SELECT * INTO r FROM public.supplier_products_raw WHERE id = p_raw_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'raw_nao_encontrado'); END IF;
  v_ref := COALESCE(NULLIF(TRIM(p_override_reference),''), r.supplier_reference);

  FOR m IN
    SELECT source_field, source_path, target_field, transform_type, transform_config, source_unit, target_unit
    FROM public.supplier_field_mappings
    WHERE supplier_id=r.supplier_id AND target_table='products' AND is_active=TRUE AND target_field=ANY(v_cols)
    ORDER BY priority NULLS LAST
  LOOP
    BEGIN
      IF m.source_path IS NOT NULL AND m.source_path <> '' THEN
        v_path := regexp_replace(m.source_path, E'^\\\\\\$\\.?', '');
        v_val  := r.raw_data #>> string_to_array(v_path, '.');
      ELSE
        v_val := r.raw_data ->> m.source_field;
      END IF;

      IF v_val IS NULL THEN CONTINUE; END IF;

      -- FIX 1: supplier_id como 6º parâmetro
      v_tx := public.fn_apply_transform(
        v_val, m.transform_type, m.transform_config,
        m.source_unit, m.target_unit,
        r.supplier_id
      );

      v_assigns := v_assigns || jsonb_build_object(m.target_field, v_tx);
    EXCEPTION WHEN OTHERS THEN
      v_errs := v_errs || jsonb_build_object('field', m.target_field, 'error', SQLERRM);
    END;
  END LOOP;

  -- NCM
  v_ncm_raw := COALESCE(v_assigns->>'ncm_code', r.raw_data->>'Ncm', r.raw_data->>'ncm');
  IF v_ncm_raw IS NOT NULL THEN
    v_ncm := public.fn_normalize_ncm(v_ncm_raw);
    IF v_ncm IS NOT NULL THEN
      v_assigns := v_assigns || jsonb_build_object('ncm_code', v_ncm);
    ELSE
      v_assigns := v_assigns - 'ncm_code'; -- remove ncm invalido (00000000, vazio)
      SELECT ipi_rate INTO v_ncm_ipi FROM public.ncm_codes WHERE code = v_ncm LIMIT 1;
      IF v_ncm_ipi IS NOT NULL THEN
        v_assigns := v_assigns || jsonb_build_object('ipi_rate', v_ncm_ipi);
      END IF;
    END IF;
  END IF;

  SELECT id INTO v_pad_id FROM public.produtos_padronizacao
  WHERE supplier_id = r.supplier_id AND supplier_reference = v_ref;

  IF v_pad_id IS NULL THEN
    INSERT INTO public.produtos_padronizacao
      (supplier_id, supplier_reference, raw_id, status)
    VALUES (r.supplier_id, v_ref, r.id, 'pending')
    RETURNING id INTO v_pad_id;
  END IF;

  IF jsonb_typeof(v_assigns) = 'object' AND v_assigns <> '{}'::jsonb THEN
    v_status := 'standardized';
  ELSE
    v_status := 'pending';
  END IF;

  -- Clamp: stock negativo → 0
  IF (v_assigns->>'stock_quantity') IS NOT NULL
    AND (v_assigns->>'stock_quantity')::numeric < 0 THEN
    v_assigns := v_assigns || jsonb_build_object('stock_quantity', 0);
  END IF;

  UPDATE public.produtos_padronizacao
  SET
    -- ✅ PATCH: fn_normalize_product_name — nome entra sempre em MAIÚSCULO na Silver
    name               = COALESCE(public.fn_normalize_product_name(v_assigns->>'name'), name),
    description        = COALESCE((v_assigns->>'description')::text,                                   description),
    short_description  = COALESCE((v_assigns->>'short_description')::text,                             short_description),
    -- FIX 2+3: fn_safe_num() + NULLIF — tolera JSON strings e zeros inválidos
    cost_price         = COALESCE(NULLIF(public.fn_safe_num(v_assigns->>'cost_price'),      0),        cost_price),
    suggested_price    = COALESCE(NULLIF(public.fn_safe_num(v_assigns->>'suggested_price'), 0),        suggested_price),
    stock_quantity     = COALESCE(public.fn_safe_int(v_assigns->>'stock_quantity'),                     stock_quantity),  -- zero VÁLIDO
    primary_image_url  = COALESCE((v_assigns->>'primary_image_url')::text,                             primary_image_url),
    ncm_code           = COALESCE((v_assigns->>'ncm_code')::text,                                      ncm_code),
    weight_g           = COALESCE(NULLIF(public.fn_safe_int(v_assigns->>'weight_g'),  0),              weight_g),
    height_cm          = COALESCE(NULLIF(public.fn_safe_num(v_assigns->>'height_cm'), 0),              height_cm),
    width_cm           = COALESCE(NULLIF(public.fn_safe_num(v_assigns->>'width_cm'),  0),              width_cm),
    length_cm          = COALESCE(NULLIF(public.fn_safe_num(v_assigns->>'length_cm'), 0),              length_cm),
    min_quantity       = COALESCE(public.fn_safe_int(v_assigns->>'min_quantity'),                       min_quantity),    -- zero VÁLIDO
    ipi_rate           = COALESCE(public.fn_safe_num(v_assigns->>'ipi_rate'),                           ipi_rate),
    brand              = COALESCE((v_assigns->>'brand')::text,                                          brand),
    packing_type       = COALESCE((v_assigns->>'packing_type')::text,                                   packing_type),
    capacity_ml        = COALESCE(NULLIF(public.fn_safe_int(v_assigns->>'capacity_ml'), 0),            capacity_ml),
    is_active          = COALESCE((v_assigns->>'is_active')::boolean,                                   is_active),
    product_type       = COALESCE((v_assigns->>'product_type')::text,                                   product_type),
    raw_id             = r.id,
    status             = v_status,
    standardized_at    = CASE WHEN v_status = 'standardized' THEN now() ELSE standardized_at END,
    validation_errors  = CASE WHEN jsonb_array_length(v_errs) > 0 THEN v_errs ELSE NULL END,
    updated_at         = now()
  WHERE id = v_pad_id;

  RETURN jsonb_build_object(
    'success', true, 'pad_id', v_pad_id,
    'status', v_status, 'fields_set', v_assigns,
    'errors', v_errs
  );
END;
$function$;
;
