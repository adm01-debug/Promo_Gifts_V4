
-- ============================================================
-- FUNÇÃO: fn_spot_to_silver(bronze_id UUID) → JSONB
-- Transforma 1 registro Bronze SPOT → Silver (produtos + variantes + print_areas + imagens)
-- ============================================================
-- Correções baseadas na análise dos dados reais:
--   BoxLengthMM/Width/Height: METROS (não MM!) → × 100 para CM
--   Area{N}: MM formato "L x H" → ÷ 10 para CM
--   CustomizationTypes{N}: pode ter vírgulas ("Silk Screen, Laser")
--   WeightGr: pode ser "80 g/m²" — extrair apenas número
--   TableCodes{N}: códigos SPOT (SCR1, PDP1...) → armazenar como raw
-- ============================================================
CREATE OR REPLACE FUNCTION fn_spot_to_silver(p_bronze_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_raw           JSONB;
  v_supplier_id   UUID;
  v_silver_id     UUID;
  v_errors        JSONB := '[]';
  v_warnings      JSONB := '[]';
  v_category_id   UUID;
  v_i             INT;
  v_technique_norm TEXT;
  v_technique_raw  TEXT;
  v_technique_arr  TEXT[];
  v_tech_item      TEXT;
  v_location_raw   TEXT;
  v_component_raw  TEXT;
  v_table_code_raw TEXT;
  v_area_raw       TEXT;
  v_area_match     TEXT[];
  v_area_w         NUMERIC;
  v_area_h         NUMERIC;
  v_sku            TEXT;
  v_weight_g       NUMERIC;
  v_vars           INT := 0;
  v_areas          INT := 0;
BEGIN

  -- --------------------------------------------------------
  -- 1. Carregar Bronze
  -- --------------------------------------------------------
  SELECT raw_data, supplier_id
  INTO   v_raw, v_supplier_id
  FROM   supplier_products_raw
  WHERE  id = p_bronze_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bronze % não encontrado', p_bronze_id;
  END IF;

  IF v_raw->>'ProdReference' IS NULL THEN
    RAISE EXCEPTION 'ProdReference ausente em bronze_id %', p_bronze_id;
  END IF;

  -- --------------------------------------------------------
  -- 2. Categoria (via supplier_category_mappings)
  -- --------------------------------------------------------
  SELECT c.id INTO v_category_id
  FROM   supplier_category_mappings scm
  JOIN   categories c ON c.id = scm.category_id
  WHERE  scm.supplier_category IN (
           v_raw->>'TypeCode',
           v_raw->>'SubTypeCode'
         )
  LIMIT  1;

  -- --------------------------------------------------------
  -- 3. Extrair peso — pode ser "120", "80 g/m²", ""
  -- --------------------------------------------------------
  v_weight_g := NULL;
  IF (v_raw->>'WeightGr') ~ '^\d+\.?\d*$' THEN
    v_weight_g := (v_raw->>'WeightGr')::numeric;
  ELSIF (v_raw->>'WeightGr') ~ '^\d+' THEN
    -- Extrair somente os dígitos do início (ex: "80 g/m²" → 80)
    v_weight_g := (regexp_match(v_raw->>'WeightGr', '^\d+\.?\d*'))[1]::numeric;
  END IF;

  -- --------------------------------------------------------
  -- 4. Upsert silver_products
  -- NOTA IMPORTANTE: BoxLengthMM está em METROS → × 100 para CM
  -- --------------------------------------------------------
  INSERT INTO silver_products (
    supplier_id, bronze_id,
    supplier_reference,
    name, short_description, description, brand,
    -- Dimensões produto (SPOT: SizeLengthCM já em CM; frequentemente NULL)
    length_cm, width_cm,
    weight_g, capacity_ml,
    -- Caixa: campo chama BoxXXXMM mas valor é em METROS → × 100 = CM
    box_length_cm, box_width_cm, box_height_cm,
    box_weight_kg, box_quantity, box_inner_quantity,
    -- Fiscal
    ncm_code, origin_country,
    -- Características
    is_textil, gender,
    has_colors, has_sizes, has_capacity,
    packing_type, repacking_type,
    supply_mode, min_order_quantity,
    -- Categoria
    norm_category_id,
    -- Metadados do fornecedor
    supplier_updated_at, is_active,
    -- Pipeline
    norm_status, norm_errors, norm_warnings,
    norm_confidence, normalized_by, normalized_at
  )
  VALUES (
    v_supplier_id, p_bronze_id,
    trim(v_raw->>'ProdReference'),
    COALESCE(NULLIF(trim(v_raw->>'SEOName'),''), NULLIF(trim(v_raw->>'Name'), '')),
    NULLIF(trim(v_raw->>'SEOShortDescription'),''),
    NULLIF(trim(v_raw->>'Description'),''),
    NULLIF(trim(v_raw->>'Brand'),''),
    -- Dimensões produto
    CASE WHEN (v_raw->>'SizeLengthCM') ~ '^\d+\.?\d*$'
         THEN (v_raw->>'SizeLengthCM')::numeric ELSE NULL END,
    CASE WHEN (v_raw->>'SizeWidthCM') ~ '^\d+\.?\d*$'
         THEN (v_raw->>'SizeWidthCM')::numeric ELSE NULL END,
    v_weight_g,
    CASE WHEN (v_raw->>'Capacity') ~ '^\d+$'
         THEN (v_raw->>'Capacity')::integer ELSE NULL END,
    -- Caixa: METROS × 100 = CM
    CASE WHEN (v_raw->>'BoxLengthMM') ~ '^\d+\.?\d*$' AND (v_raw->>'BoxLengthMM')::numeric > 0
         THEN round((v_raw->>'BoxLengthMM')::numeric * 100, 1) ELSE NULL END,
    CASE WHEN (v_raw->>'BoxWidthMM')  ~ '^\d+\.?\d*$' AND (v_raw->>'BoxWidthMM')::numeric > 0
         THEN round((v_raw->>'BoxWidthMM')::numeric  * 100, 1) ELSE NULL END,
    CASE WHEN (v_raw->>'BoxHeightMM') ~ '^\d+\.?\d*$' AND (v_raw->>'BoxHeightMM')::numeric > 0
         THEN round((v_raw->>'BoxHeightMM')::numeric * 100, 1) ELSE NULL END,
    CASE WHEN (v_raw->>'BoxWeightKG') ~ '^\d+\.?\d*$'
         THEN (v_raw->>'BoxWeightKG')::numeric ELSE NULL END,
    CASE WHEN (v_raw->>'BoxQuantity') ~ '^\d+$'
         THEN (v_raw->>'BoxQuantity')::integer ELSE NULL END,
    CASE WHEN (v_raw->>'BoxInnerQuantity') ~ '^\d+$'
         THEN (v_raw->>'BoxInnerQuantity')::integer ELSE NULL END,
    -- Fiscal (SPOT chama de Taric = NCM Brasil)
    NULLIF(trim(v_raw->>'Taric'),''),
    NULLIF(trim(v_raw->>'CountryOfOrigin'),''),
    -- Flags produto
    COALESCE((v_raw->>'IsTextil')::boolean, false),
    NULLIF(trim(v_raw->>'Gender'),''),
    COALESCE((v_raw->>'HasColors')::boolean, false),
    COALESCE((v_raw->>'HasSizes')::boolean, false),
    COALESCE((v_raw->>'HasCapacitys')::boolean, false),
    NULLIF(trim(v_raw->>'Packing'),''),
    NULLIF(trim(v_raw->>'Repacking'),''),
    'pronta_entrega_liso', 1,
    -- Categoria mapeada
    v_category_id,
    -- Metadados
    CASE WHEN (v_raw->>'UpdateDate') ~ '^\d{4}-\d{2}-\d{2}'
         THEN (v_raw->>'UpdateDate')::timestamptz ELSE NULL END,
    NOT COALESCE((v_raw->>'NoReplenishment')::boolean, false),
    -- Pipeline
    'normalized', '[]'::jsonb, '[]'::jsonb,
    CASE WHEN v_category_id IS NOT NULL THEN 0.8 ELSE 0.5 END,
    'fn_spot_to_silver', now()
  )
  ON CONFLICT (supplier_id, supplier_reference) DO UPDATE SET
    bronze_id             = EXCLUDED.bronze_id,
    name                  = EXCLUDED.name,
    short_description     = EXCLUDED.short_description,
    description           = EXCLUDED.description,
    brand                 = EXCLUDED.brand,
    length_cm             = EXCLUDED.length_cm,
    width_cm              = EXCLUDED.width_cm,
    weight_g              = EXCLUDED.weight_g,
    capacity_ml           = EXCLUDED.capacity_ml,
    box_length_cm         = EXCLUDED.box_length_cm,
    box_width_cm          = EXCLUDED.box_width_cm,
    box_height_cm         = EXCLUDED.box_height_cm,
    box_weight_kg         = EXCLUDED.box_weight_kg,
    box_quantity          = EXCLUDED.box_quantity,
    box_inner_quantity    = EXCLUDED.box_inner_quantity,
    ncm_code              = EXCLUDED.ncm_code,
    origin_country        = EXCLUDED.origin_country,
    is_textil             = EXCLUDED.is_textil,
    has_colors            = EXCLUDED.has_colors,
    has_sizes             = EXCLUDED.has_sizes,
    has_capacity          = EXCLUDED.has_capacity,
    packing_type          = EXCLUDED.packing_type,
    repacking_type        = EXCLUDED.repacking_type,
    norm_category_id      = EXCLUDED.norm_category_id,
    supplier_updated_at   = EXCLUDED.supplier_updated_at,
    is_active             = EXCLUDED.is_active,
    norm_status           = EXCLUDED.norm_status,
    norm_confidence       = EXCLUDED.norm_confidence,
    normalized_by         = EXCLUDED.normalized_by,
    normalized_at         = EXCLUDED.normalized_at,
    updated_at            = now()
  RETURNING id INTO v_silver_id;

  -- --------------------------------------------------------
  -- 5. Variante (SPOT: 1 registro bronze = 1 variante/SKU)
  -- --------------------------------------------------------
  v_sku := NULLIF(trim(COALESCE(v_raw->>'WebSku', v_raw->>'Sku')),'');
  IF v_sku IS NOT NULL THEN
    INSERT INTO silver_variants (
      silver_product_id, supplier_id, bronze_id,
      supplier_sku,
      color_code, color_name, color_hex, color_hex_secondary,
      stock_quantity, is_stockout, is_active,
      min_qty_1, cost_price_1,   min_qty_2, cost_price_2,
      min_qty_3, cost_price_3,   min_qty_4, cost_price_4,
      min_qty_5, cost_price_5,   min_qty_6, cost_price_6,
      min_qty_7, cost_price_7,   min_qty_8, cost_price_8,
      min_qty_9, cost_price_9,   min_qty_10, cost_price_10,
      norm_status
    )
    VALUES (
      v_silver_id, v_supplier_id, p_bronze_id, v_sku,
      NULLIF(trim(v_raw->>'ColorCode'),''),
      NULLIF(trim(v_raw->>'ColorDesc1'),''),
      NULLIF(trim(REPLACE(v_raw->>'ColorHex1','#','')),''),
      NULLIF(trim(REPLACE(v_raw->>'ColorHex2','#','')),''),
      COALESCE(CASE WHEN (v_raw->>'AvailableGross') ~ '^\d+$'
               THEN (v_raw->>'AvailableGross')::int END, 0),
      COALESCE((v_raw->>'IsStockOut')::boolean, false),
      NOT COALESCE((v_raw->>'IsStockOut')::boolean, false),
      CASE WHEN (v_raw->>'MinQt1')  ~ '^\d+$' THEN (v_raw->>'MinQt1')::int  END,
      CASE WHEN (v_raw->>'Price1')  ~ '^\d+\.?\d*$' THEN (v_raw->>'Price1')::numeric END,
      CASE WHEN (v_raw->>'MinQt2')  ~ '^\d+$' THEN (v_raw->>'MinQt2')::int  END,
      CASE WHEN (v_raw->>'Price2')  ~ '^\d+\.?\d*$' THEN (v_raw->>'Price2')::numeric END,
      CASE WHEN (v_raw->>'MinQt3')  ~ '^\d+$' THEN (v_raw->>'MinQt3')::int  END,
      CASE WHEN (v_raw->>'Price3')  ~ '^\d+\.?\d*$' THEN (v_raw->>'Price3')::numeric END,
      CASE WHEN (v_raw->>'MinQt4')  ~ '^\d+$' THEN (v_raw->>'MinQt4')::int  END,
      CASE WHEN (v_raw->>'Price4')  ~ '^\d+\.?\d*$' THEN (v_raw->>'Price4')::numeric END,
      CASE WHEN (v_raw->>'MinQt5')  ~ '^\d+$' THEN (v_raw->>'MinQt5')::int  END,
      CASE WHEN (v_raw->>'Price5')  ~ '^\d+\.?\d*$' THEN (v_raw->>'Price5')::numeric END,
      CASE WHEN (v_raw->>'MinQt6')  ~ '^\d+$' THEN (v_raw->>'MinQt6')::int  END,
      CASE WHEN (v_raw->>'Price6')  ~ '^\d+\.?\d*$' THEN (v_raw->>'Price6')::numeric END,
      CASE WHEN (v_raw->>'MinQt7')  ~ '^\d+$' THEN (v_raw->>'MinQt7')::int  END,
      CASE WHEN (v_raw->>'Price7')  ~ '^\d+\.?\d*$' THEN (v_raw->>'Price7')::numeric END,
      CASE WHEN (v_raw->>'MinQt8')  ~ '^\d+$' THEN (v_raw->>'MinQt8')::int  END,
      CASE WHEN (v_raw->>'Price8')  ~ '^\d+\.?\d*$' THEN (v_raw->>'Price8')::numeric END,
      CASE WHEN (v_raw->>'MinQt9')  ~ '^\d+$' THEN (v_raw->>'MinQt9')::int  END,
      CASE WHEN (v_raw->>'Price9')  ~ '^\d+\.?\d*$' THEN (v_raw->>'Price9')::numeric END,
      CASE WHEN (v_raw->>'MinQt10') ~ '^\d+$' THEN (v_raw->>'MinQt10')::int END,
      CASE WHEN (v_raw->>'Price10') ~ '^\d+\.?\d*$' THEN (v_raw->>'Price10')::numeric END,
      'normalized'
    )
    ON CONFLICT (supplier_id, supplier_sku) DO UPDATE SET
      stock_quantity   = EXCLUDED.stock_quantity,
      is_stockout      = EXCLUDED.is_stockout,
      is_active        = EXCLUDED.is_active,
      color_code       = EXCLUDED.color_code,
      color_name       = EXCLUDED.color_name,
      color_hex        = EXCLUDED.color_hex,
      cost_price_1     = EXCLUDED.cost_price_1,
      min_qty_1        = EXCLUDED.min_qty_1,
      cost_price_2     = EXCLUDED.cost_price_2,
      min_qty_2        = EXCLUDED.min_qty_2,
      cost_price_3     = EXCLUDED.cost_price_3,
      min_qty_3        = EXCLUDED.min_qty_3,
      cost_price_4     = EXCLUDED.cost_price_4,
      min_qty_4        = EXCLUDED.min_qty_4,
      cost_price_5     = EXCLUDED.cost_price_5,
      min_qty_5        = EXCLUDED.min_qty_5,
      updated_at       = now();
    v_vars := v_vars + 1;
  END IF;

  -- --------------------------------------------------------
  -- 6. Áreas de gravação (Component{1..8} + Location{1..8})
  --    CustomizationTypes{N} pode ser multi-valor separado por vírgula
  --    Area{N} = "L x H" em MM → ÷ 10 para CM
  -- --------------------------------------------------------
  FOR v_i IN 1..8 LOOP
    v_location_raw  := NULLIF(trim(v_raw->>('Location' || v_i::text)),'');
    v_technique_raw := NULLIF(trim(v_raw->>('CustomizationTypes' || v_i::text)),'');
    v_component_raw := NULLIF(trim(v_raw->>('Component' || v_i::text)),'');
    v_table_code_raw := NULLIF(trim(v_raw->>('TableCodes' || v_i::text)),'');
    v_area_raw      := NULLIF(trim(v_raw->>('Area' || v_i::text)),'');

    CONTINUE WHEN v_location_raw IS NULL;

    -- Parsear dimensão da área: "45 x 10" → 4.5cm × 1.0cm
    v_area_w := NULL; v_area_h := NULL;
    IF v_area_raw IS NOT NULL THEN
      v_area_match := regexp_match(v_area_raw, '(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)');
      IF v_area_match IS NOT NULL THEN
        v_area_w := round(v_area_match[1]::numeric / 10, 2);
        v_area_h := round(v_area_match[2]::numeric / 10, 2);
      END IF;
    END IF;

    -- Técnicas podem ser múltiplas: "Silk Screen, Laser CO2"
    IF v_technique_raw IS NOT NULL THEN
      v_technique_arr := string_to_array(v_technique_raw, ',');
    ELSE
      v_technique_arr := ARRAY['']::text[];
    END IF;

    FOREACH v_tech_item IN ARRAY v_technique_arr LOOP
      v_tech_item := trim(v_tech_item);
      CONTINUE WHEN v_tech_item = '';

      -- Mapear nome da técnica SPOT → codigo canônico tecnicas_gravacao
      v_technique_norm := CASE v_tech_item
        WHEN 'Silk Screen'         THEN 'SERIGRAFIA'
        WHEN 'Serigrafia'          THEN 'SERIGRAFIA'
        WHEN 'Tampografia'         THEN 'TAMPOGRAFIA'
        WHEN 'Laser CO2'           THEN 'LASER_CO2'
        WHEN 'Laser Fibra'         THEN 'LASER'
        WHEN 'Laser Circular'      THEN 'LASER'
        WHEN 'Laser'               THEN 'LASER'
        WHEN 'UV'                  THEN 'UV_DIGITAL'
        WHEN 'UV Digital'          THEN 'UV_DIGITAL'
        WHEN 'UV Digital Circular' THEN 'UV_DIGITAL'
        WHEN 'Transfer'            THEN 'TRANSFER_DIGITAL'
        WHEN 'DTF (Direct to Film)' THEN 'TRANSFER_DIGITAL'
        WHEN 'Sublimação'          THEN 'SUBLIMACAO'
        WHEN 'Bordado'             THEN 'BORDADO'
        ELSE NULL
      END;

      -- Verificar se técnica existe no catálogo (validação)
      IF v_technique_norm IS NOT NULL THEN
        PERFORM 1 FROM tecnicas_gravacao
        WHERE codigo = v_technique_norm AND ativo = true;
        IF NOT FOUND THEN v_technique_norm := NULL; END IF;
      END IF;

      INSERT INTO silver_print_areas (
        silver_product_id, supplier_id,
        component_code, component_name, component_order,
        location_code,  location_name,  location_order,
        area_width_cm, area_height_cm,
        area_cm2,
        norm_technique_code,
        supplier_technique_raw,
        supplier_location_raw,
        supplier_table_code_raw,
        max_colors,
        is_default,
        mapping_confidence,
        norm_status
      )
      VALUES (
        v_silver_id, v_supplier_id,
        COALESCE(v_component_raw, 'PRODUTO'),
        v_component_raw,
        v_i,
        v_location_raw, v_location_raw, v_i,
        v_area_w, v_area_h,
        CASE WHEN v_area_w IS NOT NULL AND v_area_h IS NOT NULL
             THEN round(v_area_w * v_area_h, 4) ELSE NULL END,
        v_technique_norm,
        v_tech_item,
        v_location_raw,
        v_table_code_raw,
        CASE WHEN (v_raw->>('MaxColors'||v_i::text)) ~ '^\d+$'
             THEN (v_raw->>('MaxColors'||v_i::text))::int ELSE NULL END,
        (v_i = 1 AND v_technique_arr[1] = v_tech_item),
        CASE WHEN v_technique_norm IS NOT NULL THEN 0.95 ELSE 0.2 END,
        CASE WHEN v_technique_norm IS NOT NULL THEN 'normalized' ELSE 'raw' END
      )
      ON CONFLICT (silver_product_id, component_code, location_code, norm_technique_code)
      DO UPDATE SET
        area_width_cm          = EXCLUDED.area_width_cm,
        area_height_cm         = EXCLUDED.area_height_cm,
        area_cm2               = EXCLUDED.area_cm2,
        max_colors             = EXCLUDED.max_colors,
        supplier_technique_raw = EXCLUDED.supplier_technique_raw,
        supplier_table_code_raw = EXCLUDED.supplier_table_code_raw,
        mapping_confidence     = EXCLUDED.mapping_confidence,
        norm_status            = EXCLUDED.norm_status,
        updated_at             = now();

      v_areas := v_areas + 1;
    END LOOP;
  END LOOP;

  -- --------------------------------------------------------
  -- 7. Imagens (MainImage + AditionalImageList)
  -- --------------------------------------------------------
  IF (v_raw->>'MainImage') IS NOT NULL AND trim(v_raw->>'MainImage') != '' THEN
    INSERT INTO silver_images_queue (
      silver_product_id, supplier_id,
      source_url, image_type, is_primary, display_order
    )
    VALUES (
      v_silver_id, v_supplier_id,
      trim(v_raw->>'MainImage'), 'main', true, 0
    )
    ON CONFLICT DO NOTHING;
  END IF;

  IF jsonb_typeof(v_raw->'AditionalImageList') = 'array' THEN
    FOR v_i IN 0..jsonb_array_length(v_raw->'AditionalImageList')-1 LOOP
      INSERT INTO silver_images_queue (
        silver_product_id, supplier_id,
        source_url, image_type, is_primary, display_order
      )
      VALUES (
        v_silver_id, v_supplier_id,
        NULLIF(trim(v_raw->'AditionalImageList'->v_i->>'ImageUrl'),''),
        'gallery', false, v_i + 1
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- --------------------------------------------------------
  -- 8. Marcar Bronze como processado
  -- --------------------------------------------------------
  UPDATE supplier_products_raw
  SET    status = 'processed', processed_at = now()
  WHERE  id = p_bronze_id;

  RETURN jsonb_build_object(
    'silver_product_id',  v_silver_id,
    'supplier_reference', v_raw->>'ProdReference',
    'sku',                v_sku,
    'variants',           v_vars,
    'print_areas',        v_areas,
    'category_mapped',    v_category_id IS NOT NULL,
    'status',             'normalized'
  );

EXCEPTION WHEN OTHERS THEN
  UPDATE supplier_products_raw
  SET    status     = 'failed',
         last_error = jsonb_build_object('fn','fn_spot_to_silver','msg',SQLERRM,'ts',now()),
         attempts   = attempts + 1
  WHERE  id = p_bronze_id;
  RAISE;
END;
$$;

-- ============================================================
-- FUNÇÃO: fn_spot_batch_to_silver — processar lote
-- ============================================================
CREATE OR REPLACE FUNCTION fn_spot_batch_to_silver(p_batch_size INT DEFAULT 50)
RETURNS TABLE(processed INT, errors INT)
LANGUAGE plpgsql AS $$
DECLARE
  v_bronze_id   UUID;
  v_processed   INT := 0;
  v_errors      INT := 0;
  v_supplier_id UUID;
BEGIN
  SELECT id INTO v_supplier_id FROM suppliers WHERE code = 'STRICKER' LIMIT 1;

  FOR v_bronze_id IN (
    SELECT id
    FROM   supplier_products_raw
    WHERE  supplier_id = v_supplier_id
      AND  status IN ('pending','failed')
      AND  attempts < 3
    ORDER  BY imported_at
    LIMIT  p_batch_size
    FOR UPDATE SKIP LOCKED
  ) LOOP
    BEGIN
      PERFORM fn_spot_to_silver(v_bronze_id);
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      RAISE WARNING 'Erro em bronze_id %: %', v_bronze_id, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT v_processed, v_errors;
END;
$$;
;
