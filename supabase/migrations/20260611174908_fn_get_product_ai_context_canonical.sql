
CREATE OR REPLACE FUNCTION public.fn_get_product_ai_context(p_product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supplier_code    TEXT;
  v_supplier_id      UUID;
  v_name             TEXT;
  v_description      TEXT;
  v_short_desc       TEXT;
  v_brand            TEXT;
  v_supplier_ref     TEXT;
  v_sku              TEXT;
  v_primary_img      TEXT;
  v_allows_pers      BOOLEAN;
  v_gold_materials   JSONB;
  v_gold_colors      JSONB;
  v_gold_weight      INT;
  v_gold_combined    TEXT;
  v_gold_capacity    INT;
  v_gold_capacities  TEXT;
  v_gold_engraving   TEXT;
  v_gold_type        TEXT;
  v_gold_subtype     TEXT;
  v_gold_min_qty     INT;
  v_gold_category_id UUID;
  v_raw              JSONB;
  v_materials        TEXT[];
  v_colors           TEXT[];
  v_weight_out       INT;
  v_dimensions       TEXT;
  v_capacity_out     TEXT;
  v_cat_type         TEXT;
  v_cat_subtype      TEXT;
  v_engraving_type   TEXT;
  v_engraving_areas  TEXT[];
  v_components       TEXT[];
  v_certificates     TEXT[];
  v_min_quantity     INT;
  v_packaging        TEXT;
  v_og_image_url     TEXT;
  v_extras           JSONB := '{}';
BEGIN
  SELECT p.supplier_id, p.name, p.description, p.short_description, p.brand,
         p.supplier_reference, p.sku, p.primary_image_url, p.allows_personalization,
         p.materials, p.colors, p.weight_g, p.combined_sizes, p.capacity_ml,
         p.capacities, p.engraving_type, p.supplier_type, p.supplier_subtype,
         p.min_order_quantity, p.category_id
  INTO v_supplier_id, v_name, v_description, v_short_desc, v_brand,
       v_supplier_ref, v_sku, v_primary_img, v_allows_pers,
       v_gold_materials, v_gold_colors, v_gold_weight, v_gold_combined,
       v_gold_capacity, v_gold_capacities, v_gold_engraving,
       v_gold_type, v_gold_subtype, v_gold_min_qty, v_gold_category_id
  FROM products p
  WHERE p.id = p_product_id AND p.is_active = true AND p.is_deleted = false;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error','product_not_found','product_id',p_product_id);
  END IF;

  SELECT code INTO v_supplier_code FROM suppliers WHERE id = v_supplier_id;

  SELECT spr.raw_data INTO v_raw
  FROM supplier_products_raw spr
  WHERE spr.supplier_id = v_supplier_id
    AND spr.raw_data IS NOT NULL
    AND (spr.product_id = p_product_id
         OR (v_supplier_ref IS NOT NULL AND spr.supplier_sku LIKE v_supplier_ref || '%'))
  ORDER BY CASE WHEN spr.product_id = p_product_id THEN 0 ELSE 1 END, spr.updated_at DESC
  LIMIT 1;

  CASE v_supplier_code

  WHEN 'STRICKER' THEN
    v_name        := COALESCE(v_raw->>'Name', v_name);
    v_description := COALESCE(v_raw->>'Description', v_raw->>'ShortDescription', v_description);
    v_short_desc  := COALESCE(v_raw->>'ShortDescription', v_short_desc);
    v_brand       := COALESCE(v_raw->>'Brand', v_brand);
    IF v_raw->>'Materials' IS NOT NULL AND v_raw->>'Materials' <> '' THEN
      SELECT array_agg(trim(x)) INTO v_materials FROM unnest(string_to_array(v_raw->>'Materials', ',')) AS x;
    ELSE
      SELECT array_agg(x) INTO v_materials FROM jsonb_array_elements_text(COALESCE(v_gold_materials,'[]')) x;
    END IF;
    SELECT array_agg(x) INTO v_colors
    FROM unnest(ARRAY[NULLIF(v_raw->>'ColorDesc1',''), NULLIF(v_raw->>'ColorDesc2','')]) AS x WHERE x IS NOT NULL;
    v_weight_out   := v_gold_weight;
    v_dimensions   := COALESCE(v_gold_combined, v_raw->>'CombinedSizes');
    v_capacity_out := COALESCE(v_gold_capacities, NULLIF(v_raw->>'Capacity',''));
    v_cat_type     := COALESCE(v_gold_type,    v_raw->>'Type');
    v_cat_subtype  := COALESCE(v_gold_subtype, v_raw->>'SubType');
    v_engraving_type := NULLIF(v_raw->>'CustomizationTypes','');
    SELECT array_agg(a) INTO v_engraving_areas
    FROM unnest(ARRAY[v_raw->>'Area1',v_raw->>'Area2',v_raw->>'Area3',v_raw->>'Area4',
                      v_raw->>'Area5',v_raw->>'Area6',v_raw->>'Area7',v_raw->>'Area8']) AS a
    WHERE a IS NOT NULL AND a <> '';
    SELECT array_agg(DISTINCT c) INTO v_components
    FROM unnest(ARRAY[v_raw->>'Component1',v_raw->>'Component2',v_raw->>'Component3',v_raw->>'Component4']) AS c
    WHERE c IS NOT NULL AND c <> '';
    IF v_raw->>'Certificates' IS NOT NULL AND v_raw->>'Certificates' <> '' THEN
      SELECT array_agg(trim(x)) INTO v_certificates FROM unnest(string_to_array(v_raw->>'Certificates',',')) AS x;
    END IF;
    v_min_quantity := COALESCE(v_gold_min_qty, (v_raw->>'MinQt1')::INT);
    v_packaging    := NULLIF(COALESCE(v_raw->>'Packing','') ||
      CASE WHEN NULLIF(v_raw->>'Repacking','') IS NOT NULL THEN ' / '||(v_raw->>'Repacking') ELSE '' END,'');
    v_og_image_url := v_primary_img;
    v_extras := jsonb_build_object(
      'videolink', NULLIF(v_raw->>'VideoLink',''),
      'video_vimeo', NULLIF(v_raw->>'VideoLinkVimeo',''),
      'is_stockout', (v_raw->>'IsStockOut')::BOOLEAN,
      'pvc_free', (v_raw->>'PvcFree')::BOOLEAN,
      'default_customization', NULLIF(v_raw->>'DefaultCustomization',''),
      'location1', NULLIF(v_raw->>'Location1',''),
      'table_codes', NULLIF(v_raw->>'CustomizationTables',''));

  WHEN 'XBZ' THEN
    v_name        := COALESCE(v_raw->>'Nome', v_name);
    v_description := COALESCE(v_raw->>'Descricao', v_description);
    v_brand       := 'XBZ Brindes';
    SELECT array_agg(x) INTO v_materials FROM jsonb_array_elements_text(COALESCE(v_gold_materials,'[]')) x;
    SELECT array_agg(DISTINCT c) INTO v_colors
    FROM unnest(ARRAY[NULLIF(v_raw->>'CorWebPrincipal',''),
      CASE WHEN NULLIF(v_raw->>'CorWebSecundaria','') IS DISTINCT FROM NULLIF(v_raw->>'CorWebPrincipal','')
           THEN NULLIF(v_raw->>'CorWebSecundaria','') ELSE NULL END]) AS c WHERE c IS NOT NULL;
    v_weight_out   := v_gold_weight;
    v_dimensions   := v_gold_combined;
    v_capacity_out := v_gold_capacities;
    v_cat_type     := COALESCE(v_gold_type,    NULLIF(v_raw->>'WebTipo',''));
    v_cat_subtype  := COALESCE(v_gold_subtype, NULLIF(v_raw->>'WebSubTipo',''));
    v_engraving_type  := v_gold_engraving;
    IF v_gold_engraving IS NOT NULL THEN v_engraving_areas := ARRAY[v_gold_engraving]; END IF;
    v_min_quantity := COALESCE(v_gold_min_qty, (v_raw->>'VendaMinima')::INT);
    v_og_image_url := v_primary_img;
    v_extras := jsonb_build_object(
      'codigo_xbz', v_raw->>'CodigoXbz', 'site_link', v_raw->>'SiteLink',
      'disponivel', v_raw->>'Disponivel', 'ponta_estoque', (v_raw->>'PontaDeEstoque')::BOOLEAN,
      'preco_venda', (v_raw->>'PrecoVenda')::NUMERIC);

  WHEN 'ASIA' THEN
    v_name        := COALESCE(v_raw->>'nome', v_name);
    v_brand       := 'Asia Import';
    SELECT array_agg(x) INTO v_materials FROM jsonb_array_elements_text(COALESCE(v_gold_materials,'[]')) x;
    SELECT array_agg(DISTINCT c) INTO v_colors
    FROM unnest(ARRAY[NULLIF(v_raw->>'var_cor_nome',''), NULLIF(v_raw->'atributos'->'cor'->>'value','')]) AS c
    WHERE c IS NOT NULL;
    IF v_colors IS NULL THEN
      SELECT array_agg(x) INTO v_colors FROM jsonb_array_elements_text(COALESCE(v_gold_colors,'[]')) x;
    END IF;
    v_weight_out   := v_gold_weight;
    v_dimensions   := v_gold_combined;
    v_capacity_out := COALESCE(v_raw->'atributos'->'volume-litros'->>'value', v_gold_capacities);
    v_cat_type     := v_gold_type;
    v_cat_subtype  := v_gold_subtype;
    v_min_quantity := v_gold_min_qty;
    IF v_primary_img LIKE '%imagedelivery.net%' THEN
      v_og_image_url := v_primary_img;
    ELSIF v_supplier_ref IS NOT NULL THEN
      v_og_image_url := 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/asia-'
                        || lower(v_supplier_ref) || '-01/public';
    ELSE
      v_og_image_url := v_primary_img;
    END IF;
    v_extras := jsonb_build_object(
      'referencia', v_raw->>'referencia', 'var_referencia', v_raw->>'var_referencia',
      'preco', v_raw->>'preco', 'atributos', v_raw->'atributos', 'var_cor_hex', v_raw->>'var_cor_hex');

  WHEN 'SOMARCAS' THEN
    v_name        := COALESCE(v_raw->>'titulo',   v_name);
    v_description := COALESCE(v_raw->>'descricao', v_description);
    v_brand       := 'Só Marcas';
    SELECT array_agg(x) INTO v_materials FROM jsonb_array_elements_text(COALESCE(v_gold_materials,'[]')) x;
    SELECT array_agg(x) INTO v_colors    FROM jsonb_array_elements_text(COALESCE(v_gold_colors,'[]')) x;
    v_weight_out := COALESCE(v_gold_weight,
      CASE WHEN v_raw->>'peso_da_embalagem' ~ '^\d+'
           THEN (regexp_match(v_raw->>'peso_da_embalagem','^\d+'))[1]::INT ELSE NULL END);
    v_dimensions   := COALESCE(v_gold_combined, v_raw->>'dimensoes_do_produto');
    v_capacity_out := v_gold_capacities;
    v_cat_type  := COALESCE(v_gold_type,    NULLIF(split_part(COALESCE(v_raw->>'matriz_de_categorias',''),'|',1),''));
    v_cat_subtype:= COALESCE(v_gold_subtype, NULLIF(split_part(COALESCE(v_raw->>'matriz_de_categorias',''),'|',2),''));
    v_engraving_type := COALESCE(NULLIF(v_raw->>'tipo_gravacao',''), v_gold_engraving);
    v_packaging      := NULLIF(v_raw->>'embalagem_do_produto','');
    IF v_raw->>'garantia_do_produto' IS NOT NULL THEN
      v_certificates := ARRAY[v_raw->>'garantia_do_produto'];
    END IF;
    v_min_quantity := COALESCE(v_gold_min_qty, (v_raw->>'quantidade_minima_sugerida')::INT);
    v_og_image_url := COALESCE(
      CASE WHEN v_primary_img LIKE '%imagedelivery.net%' THEN v_primary_img ELSE NULL END,
      NULLIF(v_raw->>'url_foto',''), v_primary_img);
    v_extras := jsonb_build_object(
      'codigo', v_raw->>'codigo', 'garantia', v_raw->>'garantia_do_produto',
      'preco_gravacao', (v_raw->>'preco_com_gravacao_com_impostos')::NUMERIC,
      'preco_sem_gravacao', (v_raw->>'preco_sem_gravacao_com_impostos')::NUMERIC,
      'qtd_calculo_preco', (v_raw->>'quantidade_calculo_preco')::INT,
      'fotos_adicionais', v_raw->>'matriz_de_fotos_adicionais');

  ELSE
    SELECT array_agg(x) INTO v_materials FROM jsonb_array_elements_text(COALESCE(v_gold_materials,'[]')) x;
    SELECT array_agg(x) INTO v_colors    FROM jsonb_array_elements_text(COALESCE(v_gold_colors,'[]')) x;
    v_weight_out     := v_gold_weight;
    v_dimensions     := v_gold_combined;
    v_cat_type       := v_gold_type;
    v_cat_subtype    := v_gold_subtype;
    v_engraving_type := v_gold_engraving;
    v_og_image_url   := v_primary_img;
    v_extras         := COALESCE(v_raw,'{}');

  END CASE;

  RETURN jsonb_build_object(
    'product_id',       p_product_id,
    'supplier_code',    v_supplier_code,
    'sku',              v_sku,
    'supplier_reference', v_supplier_ref,
    'name',             v_name,
    'description',      v_description,
    'short_description', v_short_desc,
    'brand',            v_brand,
    'materials',        to_jsonb(COALESCE(v_materials,'{}'::TEXT[])),
    'colors',           to_jsonb(COALESCE(v_colors,'{}'::TEXT[])),
    'weight_g',         v_weight_out,
    'dimensions_display', v_dimensions,
    'capacity',         v_capacity_out,
    'category_type',    v_cat_type,
    'category_subtype', v_cat_subtype,
    'category_id',      v_gold_category_id,
    'allows_personalization', v_allows_pers,
    'engraving_type',   v_engraving_type,
    'engraving_areas',  to_jsonb(COALESCE(v_engraving_areas,'{}'::TEXT[])),
    'components',       to_jsonb(COALESCE(v_components,'{}'::TEXT[])),
    'certificates',     to_jsonb(COALESCE(v_certificates,'{}'::TEXT[])),
    'min_quantity',     v_min_quantity,
    'packaging_info',   v_packaging,
    'og_image_url',     v_og_image_url,
    'extras',           v_extras
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'supplier_code', v_supplier_code, 'product_id', p_product_id);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_get_product_ai_context(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_product_ai_context(UUID) TO service_role;

COMMENT ON FUNCTION public.fn_get_product_ai_context(UUID) IS
'Contexto canônico normalizado (Gold + Bronze raw_data) para geração de descrições por IA. Cobre: STRICKER, XBZ, ASIA, SOMARCAS + fallback. Gold-layer enrichment — somente leitura.';
;
