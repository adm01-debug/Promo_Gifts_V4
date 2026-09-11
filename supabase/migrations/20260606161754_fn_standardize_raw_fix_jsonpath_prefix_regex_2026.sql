-- FIX CRÍTICO: corrige regex de strip do prefixo JSONPath '$.campo'.
-- Bug: '^\\\$\\.?' exigia '\\$' (backslash+dollar) → não combinava '$.titulo'
-- Fix: '^\$\.?' combina '$' literal seguido de '.' opcional → strips '$.', '$' OK
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
  v_cols text[] := ARRAY[
    'name','description','short_description','cost_price','suggested_price','stock_quantity',
    'primary_image_url','images','ncm_code','weight_g','height_cm','width_cm','length_cm',
    'dimensions_display','box_length_cm','box_width_cm','box_height_cm','box_weight_kg',
    'box_volume_cm3','box_quantity','box_inner_quantity','brand','packing_type','repacking_type',
    'capacities','capacity_ml','min_quantity','warranty_months','ipi_rate','engraving_type','is_active',
    'product_type','origin_country','combined_sizes','box_image',
    'is_textil','is_stockout','is_online_exclusive','is_new','has_colors','has_sizes','allows_personalization',
    'tags','materials','meta_keywords'];
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
    -- ── CRÍTICO: strip do prefixo JSONPath '$.campo' → 'campo' ───────────────
    -- Usa E'^\$\.?' (regex ARE) para combinar '$' literal + '.' opcional.
    -- '^\$\.?' combina: $.titulo → titulo, $.descricao → descricao, titulo → titulo
    v_path := NULLIF(
                regexp_replace(
                  COALESCE(NULLIF(m.source_path,''), m.source_field, ''),
                  E'^\\$\\.?', ''          -- E'' habilita escape: \$ = $ literal, \. = . literal
                ),
                ''
              );
    IF v_path IS NULL THEN v_val := NULL;
    ELSIF position('.' IN v_path) > 0 THEN v_val := r.raw_data #>> string_to_array(v_path, '.');
    ELSE v_val := r.raw_data ->> v_path; END IF;
    CONTINUE WHEN v_val IS NULL OR TRIM(v_val)='';

    -- ─── Campos de array/jsonb (tags, materials) ─────────────────────────────
    IF m.target_field IN ('tags','materials') THEN
      IF m.transform_type IS NOT NULL AND m.transform_type NOT IN ('direct','') THEN
        BEGIN
          v_tx  := public.fn_apply_transform(v_val, m.transform_type, m.transform_config,
                                             m.source_unit, m.target_unit, r.supplier_id);
          v_arr := CASE WHEN v_tx IS NOT NULL THEN v_tx::jsonb ELSE '[]'::jsonb END;
        EXCEPTION WHEN OTHERS THEN
          v_arr := '[]'::jsonb;
          v_errs := v_errs || jsonb_build_object('field',m.target_field,'stage','array_transform','msg',SQLERRM);
        END;
      ELSE
        v_arr := (SELECT to_jsonb(COALESCE(array_agg(btrim(e)) FILTER (WHERE btrim(e) <> ''), ARRAY[]::text[]))
                  FROM unnest(string_to_array(v_val, COALESCE(m.transform_config->>'delimiter', ','))) e);
      END IF;
      IF m.target_field='tags' THEN v_tags := v_arr; ELSE v_materials := v_arr; END IF;
      CONTINUE;
    ELSIF m.target_field='meta_keywords' THEN
      v_meta := (SELECT COALESCE(array_agg(btrim(e)) FILTER (WHERE btrim(e) <> ''), ARRAY[]::text[])
                 FROM unnest(string_to_array(v_val, COALESCE(m.transform_config->>'delimiter', ','))) e);
      CONTINUE;
    END IF;
    -- ─────────────────────────────────────────────────────────────────────────

    BEGIN
      v_tx := public.fn_apply_transform(v_val, m.transform_type, m.transform_config,
                                        m.source_unit, m.target_unit, r.supplier_id);
    EXCEPTION WHEN OTHERS THEN v_tx := v_val;
      v_errs := v_errs || jsonb_build_object('field',m.target_field,'stage','transform','msg',SQLERRM);
    END;
    IF v_tx IS NOT NULL THEN v_assigns := v_assigns || jsonb_build_object(m.target_field, v_tx); END IF;
  END LOOP;

  -- NCM (inclui Taric)
  v_ncm_raw := COALESCE(v_assigns->>'ncm_code', r.raw_data->>'ncm', r.raw_data->>'Ncm', r.raw_data->>'Taric');
  v_ncm := public.fn_normalize_ncm(v_ncm_raw);
  IF v_ncm IS NOT NULL THEN v_assigns := v_assigns || jsonb_build_object('ncm_code', v_ncm);
  ELSIF v_ncm_raw IS NOT NULL THEN
    v_errs := v_errs || jsonb_build_object('field','ncm_code','stage','validate','msg','ncm_invalido','raw',v_ncm_raw);
    v_assigns := v_assigns - 'ncm_code';
  END IF;

  v_status := (CASE WHEN jsonb_array_length(v_errs)>0 AND v_assigns->>'name' IS NULL
                    THEN 'rejected' ELSE 'standardized'
               END)::public.produtos_padronizacao_status;

  INSERT INTO public.produtos_padronizacao AS pad (
    raw_id, supplier_id, supplier_reference,
    name, description, short_description, cost_price, suggested_price, stock_quantity,
    primary_image_url, images, ncm_code, weight_g, height_cm, width_cm, length_cm,
    dimensions_display, box_length_cm, box_width_cm, box_height_cm, box_weight_kg,
    box_volume_cm3, box_quantity, box_inner_quantity, brand, packing_type, repacking_type,
    capacities, capacity_ml, min_quantity, warranty_months, ipi_rate, engraving_type, is_active,
    product_type, origin_country, combined_sizes, box_image,
    is_textil, is_stockout, is_online_exclusive, is_new, has_colors, has_sizes, allows_personalization,
    tags, materials, meta_keywords,
    status, validation_errors, standardized_at
  ) VALUES (
    r.id, r.supplier_id, v_ref,
    v_assigns->>'name', v_assigns->>'description', v_assigns->>'short_description',
    public.fn_safe_num(v_assigns->>'cost_price'),
    public.fn_safe_num(v_assigns->>'suggested_price'),
    public.fn_safe_int(v_assigns->>'stock_quantity'),
    v_assigns->>'primary_image_url',
    CASE WHEN v_assigns ? 'images' THEN (v_assigns->'images') ELSE NULL END,
    v_assigns->>'ncm_code', public.fn_safe_int(v_assigns->>'weight_g'),
    public.fn_safe_num(v_assigns->>'height_cm'), public.fn_safe_num(v_assigns->>'width_cm'),
    public.fn_safe_num(v_assigns->>'length_cm'),
    v_assigns->>'dimensions_display',
    public.fn_safe_num(v_assigns->>'box_length_cm'), public.fn_safe_num(v_assigns->>'box_width_cm'),
    public.fn_safe_num(v_assigns->>'box_height_cm'), public.fn_safe_num(v_assigns->>'box_weight_kg'),
    public.fn_safe_num(v_assigns->>'box_volume_cm3'),
    public.fn_safe_int(v_assigns->>'box_quantity'), public.fn_safe_int(v_assigns->>'box_inner_quantity'),
    v_assigns->>'brand', v_assigns->>'packing_type', v_assigns->>'repacking_type',
    v_assigns->>'capacities', public.fn_safe_int(v_assigns->>'capacity_ml'),
    public.fn_safe_int(v_assigns->>'min_quantity'),
    public.fn_safe_int(v_assigns->>'warranty_months'),
    public.fn_safe_num(v_assigns->>'ipi_rate'),
    v_assigns->>'engraving_type',
    COALESCE(public.fn_safe_bool(v_assigns->>'is_active'), true),
    v_assigns->>'product_type', v_assigns->>'origin_country', v_assigns->>'combined_sizes',
    v_assigns->>'box_image',
    public.fn_safe_bool(v_assigns->>'is_textil'), public.fn_safe_bool(v_assigns->>'is_stockout'),
    public.fn_safe_bool(v_assigns->>'is_online_exclusive'), public.fn_safe_bool(v_assigns->>'is_new'),
    public.fn_safe_bool(v_assigns->>'has_colors'), public.fn_safe_bool(v_assigns->>'has_sizes'),
    (v_assigns ? 'allows_personalization'),
    v_tags, v_materials, v_meta,
    v_status,
    CASE WHEN jsonb_array_length(v_errs)>0 THEN v_errs ELSE NULL END,
    now()
  )
  ON CONFLICT (supplier_id, supplier_reference) DO UPDATE SET
    raw_id=EXCLUDED.raw_id, name=EXCLUDED.name, description=EXCLUDED.description,
    short_description=EXCLUDED.short_description, cost_price=EXCLUDED.cost_price,
    suggested_price=EXCLUDED.suggested_price, stock_quantity=EXCLUDED.stock_quantity,
    primary_image_url=EXCLUDED.primary_image_url, images=EXCLUDED.images, ncm_code=EXCLUDED.ncm_code,
    weight_g=EXCLUDED.weight_g, height_cm=EXCLUDED.height_cm, width_cm=EXCLUDED.width_cm,
    length_cm=EXCLUDED.length_cm, dimensions_display=EXCLUDED.dimensions_display,
    box_length_cm=EXCLUDED.box_length_cm, box_width_cm=EXCLUDED.box_width_cm,
    box_height_cm=EXCLUDED.box_height_cm, box_weight_kg=EXCLUDED.box_weight_kg,
    box_volume_cm3=EXCLUDED.box_volume_cm3, box_quantity=EXCLUDED.box_quantity,
    box_inner_quantity=EXCLUDED.box_inner_quantity, brand=EXCLUDED.brand,
    packing_type=EXCLUDED.packing_type, repacking_type=EXCLUDED.repacking_type,
    capacities=EXCLUDED.capacities, capacity_ml=EXCLUDED.capacity_ml,
    min_quantity=EXCLUDED.min_quantity, warranty_months=EXCLUDED.warranty_months,
    ipi_rate=EXCLUDED.ipi_rate, engraving_type=EXCLUDED.engraving_type,
    is_active=EXCLUDED.is_active, product_type=EXCLUDED.product_type,
    origin_country=EXCLUDED.origin_country, combined_sizes=EXCLUDED.combined_sizes,
    box_image=EXCLUDED.box_image, is_textil=EXCLUDED.is_textil,
    is_stockout=EXCLUDED.is_stockout, is_online_exclusive=EXCLUDED.is_online_exclusive,
    is_new=EXCLUDED.is_new, has_colors=EXCLUDED.has_colors, has_sizes=EXCLUDED.has_sizes,
    allows_personalization=EXCLUDED.allows_personalization,
    tags=COALESCE(EXCLUDED.tags, pad.tags),
    materials=COALESCE(EXCLUDED.materials, pad.materials),
    meta_keywords=COALESCE(EXCLUDED.meta_keywords, pad.meta_keywords),
    status=EXCLUDED.status, validation_errors=EXCLUDED.validation_errors,
    standardized_at=now(), updated_at=now()
  RETURNING pad.id INTO v_pad_id;

  RETURN jsonb_build_object('success',true,'padronizacao_id',v_pad_id,'reference',v_ref,
                            'campos',(SELECT count(*) FROM jsonb_object_keys(v_assigns)),'erros',v_errs);
END;
$function$;;
