-- M12 — fn_promote_padronizacao v2:
-- (a) Gold name recebe display-case (fn_display_product_name) — Silver permanece MAIÚSCULA
-- (b) Categoria: De→Para (precedência) → classify alta-confiança (fill-only, só quando Gold sem categoria)
-- Tudo o mais idêntico à versão anterior (locked_fields, NULLIF guards, CF image preservada).

CREATE OR REPLACE FUNCTION public.fn_promote_padronizacao(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  s        public.produtos_padronizacao%ROWTYPE;
  v_pid    uuid;
  v_org    uuid;
  v_locked text[];
  v_is_new boolean := false;
  v_cat_id   uuid    := NULL;
  v_cat_src  text;
  v_cat_l1   text;
  v_existing_cat uuid := NULL;
  v_min_qty  integer := NULL;
  v_display_name text;
BEGIN
  SELECT * INTO s FROM public.produtos_padronizacao WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'padronizacao_nao_encontrada', 'id', p_id);
  END IF;
  IF s.status <> 'standardized' THEN
    RETURN jsonb_build_object('success', false, 'error', 'status_invalido', 'status', s.status);
  END IF;

  PERFORM set_config('app.write_source',     'pipeline', true);
  PERFORM set_config('app.bulk_import_mode', 'true',     true);

  v_display_name := public.fn_display_product_name(s.name);

  SELECT id, locked_fields, category_id INTO v_pid, v_locked, v_existing_cat
  FROM public.products
  WHERE supplier_id = s.supplier_id AND supplier_reference = s.supplier_reference;

  IF v_pid IS NULL THEN
    v_is_new := true;
    SELECT organization_id INTO v_org FROM public.suppliers WHERE id = s.supplier_id;
    INSERT INTO public.products (organization_id, supplier_id, supplier_reference, sku, name, active, is_active, product_type)
    VALUES (v_org, s.supplier_id, s.supplier_reference,
            COALESCE(s.supplier_reference, s.name),
            COALESCE(v_display_name, s.name, 'Produto ' || s.supplier_reference),
            true, true, 'product')  -- REGRA: produto SEMPRE nasce ativo; desativação requer aprovação
    RETURNING id, locked_fields INTO v_pid, v_locked;
  END IF;

  v_locked := COALESCE(v_locked, '{}');

  -- Categoria nível 1: De→Para
  IF s.raw_id IS NOT NULL AND NOT ('category_id' = ANY(v_locked)) THEN
    BEGIN
      SELECT sfm.source_field INTO v_cat_src
      FROM public.supplier_field_mappings sfm
      WHERE sfm.supplier_id = s.supplier_id AND sfm.target_field = 'categories'
      LIMIT 1;
      IF v_cat_src IS NOT NULL THEN
        SELECT split_part(COALESCE(spr.raw_data ->> v_cat_src, ''), '|', 1)
        INTO v_cat_l1
        FROM public.supplier_products_raw spr WHERE spr.id = s.raw_id;
        IF v_cat_l1 IS NOT NULL AND TRIM(v_cat_l1) <> '' THEN
          SELECT scm.category_id INTO v_cat_id
          FROM public.supplier_categories sc
          JOIN public.supplier_category_mappings scm ON scm.supplier_category_id = sc.id
          WHERE sc.supplier_id = s.supplier_id AND TRIM(sc.supplier_code) = TRIM(v_cat_l1)
          LIMIT 1;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- Categoria nível 2: classify alta-confiança (fill-only — só quando Gold ainda sem categoria)
  IF v_cat_id IS NULL AND v_existing_cat IS NULL AND NOT ('category_id' = ANY(v_locked)) THEN
    BEGIN
      SELECT c.category_id INTO v_cat_id
      FROM public.classify_xbz_category(s.name) c
      WHERE c.confidence = 'alta'
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- min_quantity: GREATEST(supplier, categoria)
  IF s.min_quantity IS NOT NULL THEN
    SELECT GREATEST(
        s.min_quantity,
        COALESCE(c.min_order_quantity, 1)
    )
    INTO v_min_qty
    FROM public.categories c
    WHERE c.id = COALESCE(v_cat_id,
        (SELECT category_id FROM public.products WHERE id = v_pid));
    v_min_qty := COALESCE(v_min_qty, s.min_quantity);
  END IF;

  -- ── UPDATE Gold ─────────────────────────────────────────────────────
  UPDATE public.products p SET
    sku                = COALESCE(p.sku, s.supplier_reference, s.name),
    name               = CASE WHEN 'name'               = ANY(v_locked) THEN p.name               ELSE COALESCE(v_display_name, s.name, p.name)           END,
    description        = CASE WHEN 'description'        = ANY(v_locked) THEN p.description        ELSE COALESCE(s.description,        p.description)        END,
    short_description  = CASE WHEN 'short_description'  = ANY(v_locked) THEN p.short_description  ELSE COALESCE(s.short_description,  p.short_description)  END,
    cost_price         = CASE WHEN 'cost_price'         = ANY(v_locked) THEN p.cost_price         ELSE COALESCE(NULLIF(s.cost_price,      0), p.cost_price)      END,
    suggested_price    = CASE WHEN 'suggested_price'    = ANY(v_locked) THEN p.suggested_price    ELSE COALESCE(NULLIF(s.suggested_price, 0), p.suggested_price) END,
    stock_quantity     = CASE WHEN 'stock_quantity'     = ANY(v_locked) THEN p.stock_quantity     ELSE COALESCE(s.stock_quantity,     p.stock_quantity)     END,
    min_quantity       = CASE WHEN 'min_quantity'       = ANY(v_locked) THEN p.min_quantity
                              WHEN v_min_qty IS NOT NULL                THEN v_min_qty
                              ELSE COALESCE(s.min_quantity, p.min_quantity)              END,
    primary_image_url  = CASE
      WHEN 'primary_image_url' = ANY(v_locked)              THEN p.primary_image_url
      WHEN p.primary_image_url LIKE '%imagedelivery%'       THEN p.primary_image_url
      ELSE COALESCE(s.primary_image_url, p.primary_image_url)
    END,
    images             = CASE WHEN 'images'             = ANY(v_locked) THEN p.images             ELSE COALESCE(s.images,             p.images)             END,
    ncm_code           = CASE WHEN 'ncm_code'           = ANY(v_locked) THEN p.ncm_code           ELSE COALESCE(NULLIF(s.ncm_code,'00000000'), p.ncm_code)           END,
    weight_g           = CASE WHEN 'weight_g'           = ANY(v_locked) THEN p.weight_g           ELSE COALESCE(NULLIF(s.weight_g,   0), p.weight_g)   END,
    height_cm          = CASE WHEN 'height_cm'          = ANY(v_locked) THEN p.height_cm          ELSE COALESCE(NULLIF(s.height_cm,  0), p.height_cm)  END,
    width_cm           = CASE WHEN 'width_cm'           = ANY(v_locked) THEN p.width_cm           ELSE COALESCE(NULLIF(s.width_cm,   0), p.width_cm)   END,
    length_cm          = CASE WHEN 'length_cm'          = ANY(v_locked) THEN p.length_cm          ELSE COALESCE(NULLIF(s.length_cm,  0), p.length_cm)  END,
    dimensions_display = CASE WHEN 'dimensions_display' = ANY(v_locked) THEN p.dimensions_display ELSE COALESCE(s.dimensions_display, p.dimensions_display) END,
    box_length_cm      = CASE WHEN 'box_length_cm'      = ANY(v_locked) THEN p.box_length_cm      ELSE COALESCE(s.box_length_cm,      p.box_length_cm)      END,
    box_width_cm       = CASE WHEN 'box_width_cm'       = ANY(v_locked) THEN p.box_width_cm       ELSE COALESCE(s.box_width_cm,       p.box_width_cm)       END,
    box_height_cm      = CASE WHEN 'box_height_cm'      = ANY(v_locked) THEN p.box_height_cm      ELSE COALESCE(s.box_height_cm,      p.box_height_cm)      END,
    box_weight_kg      = CASE WHEN 'box_weight_kg'      = ANY(v_locked) THEN p.box_weight_kg      ELSE COALESCE(s.box_weight_kg,      p.box_weight_kg)      END,
    box_volume_cm3     = CASE WHEN 'box_volume_cm3'     = ANY(v_locked) THEN p.box_volume_cm3     ELSE COALESCE(s.box_volume_cm3,     p.box_volume_cm3)     END,
    box_quantity       = CASE WHEN 'box_quantity'       = ANY(v_locked) THEN p.box_quantity       ELSE COALESCE(s.box_quantity,       p.box_quantity)       END,
    box_inner_quantity = CASE WHEN 'box_inner_quantity' = ANY(v_locked) THEN p.box_inner_quantity ELSE COALESCE(s.box_inner_quantity, p.box_inner_quantity) END,
    brand              = CASE WHEN 'brand'              = ANY(v_locked) THEN p.brand              ELSE COALESCE(s.brand,              p.brand)              END,
    packing_type       = CASE WHEN 'packing_type'       = ANY(v_locked) THEN p.packing_type       ELSE COALESCE(s.packing_type,       p.packing_type)       END,
    repacking_type     = CASE WHEN 'repacking_type'     = ANY(v_locked) THEN p.repacking_type     ELSE COALESCE(s.repacking_type,     p.repacking_type)     END,
    capacities         = CASE WHEN 'capacities'         = ANY(v_locked) THEN p.capacities         ELSE COALESCE(s.capacities,         p.capacities)         END,
    capacity_ml        = CASE WHEN 'capacity_ml'        = ANY(v_locked) THEN p.capacity_ml        ELSE COALESCE(NULLIF(s.capacity_ml, 0), p.capacity_ml) END,
    ipi_rate           = CASE WHEN 'ipi_rate'           = ANY(v_locked) THEN p.ipi_rate           ELSE COALESCE(s.ipi_rate,           p.ipi_rate)           END,
    engraving_type     = CASE WHEN 'engraving_type'     = ANY(v_locked) THEN p.engraving_type     ELSE COALESCE(s.engraving_type,     p.engraving_type)     END,
    colors             = CASE WHEN 'colors'             = ANY(v_locked) THEN p.colors             ELSE COALESCE(s.colors,             p.colors)             END,
    combined_sizes         = CASE WHEN 'combined_sizes'         = ANY(v_locked) THEN p.combined_sizes         ELSE COALESCE(s.combined_sizes,         p.combined_sizes)         END,
    box_image              = CASE WHEN 'box_image'              = ANY(v_locked) THEN p.box_image              ELSE COALESCE(s.box_image,              p.box_image)              END,
    is_textil              = CASE WHEN 'is_textil'              = ANY(v_locked) THEN p.is_textil              ELSE COALESCE(s.is_textil,              p.is_textil)              END,
    is_stockout            = CASE WHEN 'is_stockout'            = ANY(v_locked) THEN p.is_stockout            ELSE COALESCE(s.is_stockout,            p.is_stockout)            END,
    is_online_exclusive    = CASE WHEN 'is_online_exclusive'    = ANY(v_locked) THEN p.is_online_exclusive    ELSE COALESCE(s.is_online_exclusive,    p.is_online_exclusive)    END,
    is_new                 = CASE WHEN 'is_new'                 = ANY(v_locked) THEN p.is_new                 ELSE COALESCE(s.is_new,                 p.is_new)                 END,
    has_colors             = CASE WHEN 'has_colors'             = ANY(v_locked) THEN p.has_colors             ELSE COALESCE(s.has_colors,             p.has_colors)             END,
    has_sizes              = CASE WHEN 'has_sizes'              = ANY(v_locked) THEN p.has_sizes              ELSE COALESCE(s.has_sizes,              p.has_sizes)              END,
    allows_personalization = CASE WHEN 'allows_personalization' = ANY(v_locked) THEN p.allows_personalization ELSE COALESCE(s.allows_personalization, p.allows_personalization) END,
    tags                   = CASE WHEN 'tags'                   = ANY(v_locked) THEN p.tags                   ELSE COALESCE(NULLIF(s.tags,'[]'::jsonb),      p.tags)      END,
    materials              = CASE WHEN 'materials'              = ANY(v_locked) THEN p.materials              ELSE COALESCE(NULLIF(s.materials,'[]'::jsonb), p.materials) END,
    meta_keywords          = CASE WHEN 'meta_keywords'          = ANY(v_locked) THEN p.meta_keywords          ELSE COALESCE(s.meta_keywords,          p.meta_keywords)          END,
    category_id            = CASE
      WHEN 'category_id' = ANY(v_locked) THEN p.category_id
      WHEN v_cat_id IS NOT NULL           THEN v_cat_id
      ELSE                                     p.category_id
    END,
    origin_country        = CASE WHEN 'origin_country'        = ANY(v_locked) THEN p.origin_country        ELSE COALESCE(s.origin_country,        p.origin_country)        END,
    supplier_type         = CASE WHEN 'supplier_type'         = ANY(v_locked) THEN p.supplier_type         ELSE COALESCE(s.supplier_type,         p.supplier_type)         END,
    supplier_type_code    = CASE WHEN 'supplier_type_code'    = ANY(v_locked) THEN p.supplier_type_code    ELSE COALESCE(s.supplier_type_code,    p.supplier_type_code)    END,
    supplier_subtype      = CASE WHEN 'supplier_subtype'      = ANY(v_locked) THEN p.supplier_subtype      ELSE COALESCE(s.supplier_subtype,      p.supplier_subtype)      END,
    supplier_subtype_code = CASE WHEN 'supplier_subtype_code' = ANY(v_locked) THEN p.supplier_subtype_code ELSE COALESCE(s.supplier_subtype_code, p.supplier_subtype_code) END,
    is_seasonal           = CASE WHEN 'is_seasonal'           = ANY(v_locked) THEN p.is_seasonal           ELSE COALESCE(s.is_seasonal,           p.is_seasonal)           END,
    pvc_free              = CASE WHEN 'pvc_free'              = ANY(v_locked) THEN p.pvc_free              ELSE COALESCE(s.pvc_free,              p.pvc_free)              END,
    last_sync_at          = now(),
    last_sync_supplier_id = s.supplier_id,
    supplier_updated_at   = now()
  WHERE p.id = v_pid;

  UPDATE public.produtos_padronizacao
     SET status='promoted', promoted_at=now(), product_id=v_pid
   WHERE id = p_id;

  IF s.raw_id IS NOT NULL THEN
    UPDATE public.supplier_products_raw
       SET status='processed', processed_at=now(), product_id=v_pid, process_errors=NULL
     WHERE id = s.raw_id;
    PERFORM public.fn_sync_single_product_dimensions(
              v_pid, (SELECT raw_data FROM public.supplier_products_raw WHERE id = s.raw_id));
  END IF;

  RETURN jsonb_build_object(
    'success',          true,
    'product_id',       v_pid,
    'created',          v_is_new,
    'locked_preserved', v_locked,
    'min_quantity_final', v_min_qty,
    'display_name',     v_display_name,
    'category_depara',  CASE WHEN v_cat_id IS NOT NULL
                             THEN jsonb_build_object('category_id', v_cat_id, 'l1_raw', v_cat_l1)
                             ELSE 'null'::jsonb END
  );
END;
$function$;;
