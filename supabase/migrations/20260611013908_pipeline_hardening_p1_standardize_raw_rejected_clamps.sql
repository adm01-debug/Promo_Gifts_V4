-- HARDENING P1 — fn_standardize_raw: fallback name + clamp money + rejected explícito
-- (achados #4/#5 da simulação massiva 2026-06-11)
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
  v_final_name text;
  v_money numeric;
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
        v_path := regexp_replace(m.source_path, E'^\\$\\.?', '');
        v_val  := r.raw_data #>> string_to_array(v_path, '.');
      ELSE
        v_val := r.raw_data ->> m.source_field;
      END IF;

      IF v_val IS NULL THEN CONTINUE; END IF;

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

  -- FALLBACK genérico de name (2026-06-11)
  IF NULLIF(TRIM(v_assigns->>'name'),'') IS NULL THEN
    v_val := COALESCE(
      NULLIF(TRIM(r.raw_data->>'nome'),''),
      NULLIF(TRIM(r.raw_data->>'Nome'),''),
      NULLIF(TRIM(r.raw_data->>'name'),''),
      NULLIF(TRIM(r.raw_data->>'Name'),''),
      NULLIF(TRIM(r.raw_data->>'titulo'),''),
      NULLIF(TRIM(r.raw_data->>'Titulo'),''));
    IF v_val IS NOT NULL THEN
      v_assigns := v_assigns || jsonb_build_object('name', v_val);
    END IF;
  END IF;

  -- CLAMP money (2026-06-11): fora de (0, 99999999.99] não entra na Silver
  FOREACH v_val IN ARRAY ARRAY['cost_price','suggested_price'] LOOP
    IF v_assigns ? v_val THEN
      v_money := public.fn_safe_num(v_assigns->>v_val);
      IF v_money IS NOT NULL AND (v_money < 0 OR v_money > 99999999.99) THEN
        v_assigns := v_assigns - v_val;
        v_errs := v_errs || jsonb_build_object('field', v_val, 'error',
          'valor_fora_do_dominio: '||v_money::text);
      END IF;
    END IF;
  END LOOP;

  -- NCM: normaliza; inválido é removido
  v_ncm_raw := COALESCE(v_assigns->>'ncm_code', r.raw_data->>'Ncm', r.raw_data->>'ncm');
  IF v_ncm_raw IS NOT NULL THEN
    v_ncm := public.fn_normalize_ncm(v_ncm_raw);
    IF v_ncm IS NOT NULL THEN
      v_assigns := v_assigns || jsonb_build_object('ncm_code', v_ncm);
    ELSE
      v_assigns := v_assigns - 'ncm_code';
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

  -- BRAND PERMANENTE
  v_assigns := v_assigns || jsonb_build_object(
    'brand', public.fn_brand_from_supplier(r.supplier_id)
  );

  -- Clamp: stock negativo → 0
  IF (v_assigns->>'stock_quantity') IS NOT NULL
    AND public.fn_safe_num(v_assigns->>'stock_quantity') IS NOT NULL
    AND public.fn_safe_num(v_assigns->>'stock_quantity') < 0 THEN
    v_assigns := v_assigns || jsonb_build_object('stock_quantity', 0);
  END IF;

  UPDATE public.produtos_padronizacao
  SET
    name               = COALESCE(public.fn_normalize_product_name(v_assigns->>'name'), name),
    description        = COALESCE((v_assigns->>'description')::text,                                   description),
    short_description  = COALESCE((v_assigns->>'short_description')::text,                             short_description),
    cost_price         = COALESCE(NULLIF(public.fn_safe_num(v_assigns->>'cost_price'),      0),        cost_price),
    suggested_price    = COALESCE(NULLIF(public.fn_safe_num(v_assigns->>'suggested_price'), 0),        suggested_price),
    stock_quantity     = COALESCE(public.fn_safe_int(v_assigns->>'stock_quantity'),                     stock_quantity),
    primary_image_url  = COALESCE((v_assigns->>'primary_image_url')::text,                             primary_image_url),
    images             = COALESCE(public.fn_safe_jsonb_arr(v_assigns->>'images'),                       images),
    ncm_code           = COALESCE((v_assigns->>'ncm_code')::text,                                      ncm_code),
    weight_g           = COALESCE(NULLIF(public.fn_safe_int(v_assigns->>'weight_g'),  0),              weight_g),
    height_cm          = COALESCE(NULLIF(public.fn_safe_num(v_assigns->>'height_cm'), 0),              height_cm),
    width_cm           = COALESCE(NULLIF(public.fn_safe_num(v_assigns->>'width_cm'),  0),              width_cm),
    length_cm          = COALESCE(NULLIF(public.fn_safe_num(v_assigns->>'length_cm'), 0),              length_cm),
    dimensions_display = COALESCE((v_assigns->>'dimensions_display')::text,                            dimensions_display),
    box_length_cm      = COALESCE(NULLIF(public.fn_safe_num(v_assigns->>'box_length_cm'), 0),          box_length_cm),
    box_width_cm       = COALESCE(NULLIF(public.fn_safe_num(v_assigns->>'box_width_cm'),  0),          box_width_cm),
    box_height_cm      = COALESCE(NULLIF(public.fn_safe_num(v_assigns->>'box_height_cm'), 0),          box_height_cm),
    box_weight_kg      = COALESCE(NULLIF(public.fn_safe_num(v_assigns->>'box_weight_kg'), 0),          box_weight_kg),
    box_volume_cm3     = COALESCE(NULLIF(public.fn_safe_num(v_assigns->>'box_volume_cm3'),0),          box_volume_cm3),
    box_quantity       = COALESCE(NULLIF(public.fn_safe_int(v_assigns->>'box_quantity'), 0),           box_quantity),
    box_inner_quantity = COALESCE(NULLIF(public.fn_safe_int(v_assigns->>'box_inner_quantity'), 0),     box_inner_quantity),
    brand              = COALESCE((v_assigns->>'brand')::text,                                          brand),
    packing_type       = COALESCE((v_assigns->>'packing_type')::text,                                   packing_type),
    repacking_type     = COALESCE((v_assigns->>'repacking_type')::text,                                 repacking_type),
    capacities         = COALESCE((v_assigns->>'capacities')::text,                                     capacities),
    capacity_ml        = COALESCE(NULLIF(public.fn_safe_int(v_assigns->>'capacity_ml'), 0),            capacity_ml),
    min_quantity       = COALESCE(public.fn_safe_int(v_assigns->>'min_quantity'),                       min_quantity),
    ipi_rate           = COALESCE(public.fn_safe_num(v_assigns->>'ipi_rate'),                           ipi_rate),
    engraving_type     = COALESCE((v_assigns->>'engraving_type')::text,                                 engraving_type),
    is_active          = COALESCE(public.fn_safe_bool(v_assigns->>'is_active'),                         is_active),
    product_type       = COALESCE((v_assigns->>'product_type')::text,                                   product_type),
    origin_country     = COALESCE((v_assigns->>'origin_country')::text,                                 origin_country),
    combined_sizes     = COALESCE((v_assigns->>'combined_sizes')::text,                                 combined_sizes),
    box_image          = COALESCE((v_assigns->>'box_image')::text,                                      box_image),
    is_textil              = COALESCE(public.fn_safe_bool(v_assigns->>'is_textil'),              is_textil),
    is_stockout            = COALESCE(public.fn_safe_bool(v_assigns->>'is_stockout'),            is_stockout),
    is_online_exclusive    = COALESCE(public.fn_safe_bool(v_assigns->>'is_online_exclusive'),    is_online_exclusive),
    is_new                 = COALESCE(public.fn_safe_bool(v_assigns->>'is_new'),                 is_new),
    has_colors             = COALESCE(public.fn_safe_bool(v_assigns->>'has_colors'),             has_colors),
    has_sizes              = COALESCE(public.fn_safe_bool(v_assigns->>'has_sizes'),              has_sizes),
    allows_personalization = COALESCE(public.fn_safe_bool(v_assigns->>'allows_personalization'), allows_personalization),
    tags               = COALESCE(public.fn_safe_jsonb_arr(v_assigns->>'tags'),                         tags),
    materials          = COALESCE(public.fn_safe_jsonb_arr(v_assigns->>'materials'),                    materials),
    meta_keywords      = COALESCE(public.fn_safe_text_arr(v_assigns->>'meta_keywords'),                 meta_keywords),
    raw_id             = r.id,
    updated_at         = now()
  WHERE id = v_pad_id
  RETURNING name INTO v_final_name;

  -- STATUS EXPLÍCITO (2026-06-11): name ⇒ standardized; sem name ⇒ rejected.
  IF v_final_name IS NOT NULL AND TRIM(v_final_name) <> '' THEN
    v_status := 'standardized';
  ELSE
    v_status := 'rejected';
    v_errs := v_errs || jsonb_build_object('field','name','error',
      'name_ausente: nenhum mapping/fallback produziu nome');
  END IF;

  UPDATE public.produtos_padronizacao
  SET status            = v_status,
      standardized_at   = CASE WHEN v_status='standardized' THEN now() ELSE standardized_at END,
      validation_errors = CASE WHEN jsonb_array_length(v_errs) > 0 THEN v_errs ELSE NULL END
  WHERE id = v_pad_id;

  PERFORM public.fn_enrich_padronizacao(v_pad_id);

  RETURN jsonb_build_object(
    'success', v_status = 'standardized', 'pad_id', v_pad_id,
    'status', v_status, 'fields_set', v_assigns,
    'errors', v_errs
  );
END;
$function$;

COMMENT ON FUNCTION public.fn_standardize_raw(uuid, text) IS
  'Bronze->Silver (produto/pai) via de-para supplier_field_mappings + fallback generico de name. 2026-06-11: clamp money (0,1e8]; sem name => rejected + validation_errors + success=false (antes ficava pending invisivel com success=true).';;
