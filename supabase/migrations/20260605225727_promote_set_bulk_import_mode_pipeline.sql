-- Passo 1: promoção roda em modo pipeline (suprime automações pesadas de products:
-- materiais/classificação/SEO/automação), que rodam depois em lote de enriquecimento.
CREATE OR REPLACE FUNCTION public.fn_promote_padronizacao(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  s         public.produtos_padronizacao%ROWTYPE;
  v_pid     uuid;
  v_org     uuid;
  v_locked  text[];
  v_is_new  boolean := false;
BEGIN
  SELECT * INTO s FROM public.produtos_padronizacao WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'padronizacao_nao_encontrada', 'id', p_id);
  END IF;
  IF s.status <> 'standardized' THEN
    RETURN jsonb_build_object('success', false, 'error', 'status_invalido', 'status', s.status);
  END IF;

  PERFORM set_config('app.write_source', 'pipeline', true);
  PERFORM set_config('app.bulk_import_mode', 'true', true);  -- modo pipeline: adia automacoes pesadas p/ lote pos-carga

  SELECT id, locked_fields INTO v_pid, v_locked
  FROM public.products
  WHERE supplier_id = s.supplier_id AND supplier_reference = s.supplier_reference;

  IF v_pid IS NULL THEN
    v_is_new := true;
    SELECT organization_id INTO v_org FROM public.suppliers WHERE id = s.supplier_id;
    INSERT INTO public.products (organization_id, supplier_id, supplier_reference, sku, name, active, is_active, product_type)
    VALUES (v_org, s.supplier_id, s.supplier_reference,
            COALESCE(s.supplier_reference, s.name), COALESCE(s.name,'Produto '||s.supplier_reference),
            COALESCE(s.is_active, true), COALESCE(s.is_active, true), 'product')
    RETURNING id, locked_fields INTO v_pid, v_locked;
  END IF;

  v_locked := COALESCE(v_locked, '{}');

  UPDATE public.products p SET
    name               = CASE WHEN 'name'               = ANY(v_locked) THEN p.name               ELSE COALESCE(s.name, p.name) END,
    description        = CASE WHEN 'description'        = ANY(v_locked) THEN p.description        ELSE COALESCE(s.description, p.description) END,
    short_description  = CASE WHEN 'short_description'  = ANY(v_locked) THEN p.short_description  ELSE COALESCE(s.short_description, p.short_description) END,
    cost_price         = CASE WHEN 'cost_price'         = ANY(v_locked) THEN p.cost_price         ELSE COALESCE(s.cost_price, p.cost_price) END,
    suggested_price    = CASE WHEN 'suggested_price'    = ANY(v_locked) THEN p.suggested_price    ELSE COALESCE(s.suggested_price, p.suggested_price) END,
    stock_quantity     = CASE WHEN 'stock_quantity'     = ANY(v_locked) THEN p.stock_quantity     ELSE COALESCE(s.stock_quantity, p.stock_quantity) END,
    primary_image_url  = CASE WHEN 'primary_image_url'  = ANY(v_locked) THEN p.primary_image_url  ELSE COALESCE(s.primary_image_url, p.primary_image_url) END,
    images             = CASE WHEN 'images'             = ANY(v_locked) THEN p.images             ELSE COALESCE(s.images, p.images) END,
    ncm_code           = CASE WHEN 'ncm_code'           = ANY(v_locked) THEN p.ncm_code           ELSE COALESCE(s.ncm_code, p.ncm_code) END,
    weight_g           = CASE WHEN 'weight_g'           = ANY(v_locked) THEN p.weight_g           ELSE COALESCE(s.weight_g, p.weight_g) END,
    height_cm          = CASE WHEN 'height_cm'          = ANY(v_locked) THEN p.height_cm          ELSE COALESCE(s.height_cm, p.height_cm) END,
    width_cm           = CASE WHEN 'width_cm'           = ANY(v_locked) THEN p.width_cm           ELSE COALESCE(s.width_cm, p.width_cm) END,
    length_cm          = CASE WHEN 'length_cm'          = ANY(v_locked) THEN p.length_cm          ELSE COALESCE(s.length_cm, p.length_cm) END,
    dimensions_display = CASE WHEN 'dimensions_display' = ANY(v_locked) THEN p.dimensions_display ELSE COALESCE(s.dimensions_display, p.dimensions_display) END,
    box_length_cm      = CASE WHEN 'box_length_cm'      = ANY(v_locked) THEN p.box_length_cm      ELSE COALESCE(s.box_length_cm, p.box_length_cm) END,
    box_width_cm       = CASE WHEN 'box_width_cm'       = ANY(v_locked) THEN p.box_width_cm       ELSE COALESCE(s.box_width_cm, p.box_width_cm) END,
    box_height_cm      = CASE WHEN 'box_height_cm'      = ANY(v_locked) THEN p.box_height_cm      ELSE COALESCE(s.box_height_cm, p.box_height_cm) END,
    box_weight_kg      = CASE WHEN 'box_weight_kg'      = ANY(v_locked) THEN p.box_weight_kg      ELSE COALESCE(s.box_weight_kg, p.box_weight_kg) END,
    box_volume_cm3     = CASE WHEN 'box_volume_cm3'     = ANY(v_locked) THEN p.box_volume_cm3     ELSE COALESCE(s.box_volume_cm3, p.box_volume_cm3) END,
    box_quantity       = CASE WHEN 'box_quantity'       = ANY(v_locked) THEN p.box_quantity       ELSE COALESCE(s.box_quantity, p.box_quantity) END,
    box_inner_quantity = CASE WHEN 'box_inner_quantity' = ANY(v_locked) THEN p.box_inner_quantity ELSE COALESCE(s.box_inner_quantity, p.box_inner_quantity) END,
    brand              = CASE WHEN 'brand'              = ANY(v_locked) THEN p.brand              ELSE COALESCE(s.brand, p.brand) END,
    packing_type       = CASE WHEN 'packing_type'       = ANY(v_locked) THEN p.packing_type       ELSE COALESCE(s.packing_type, p.packing_type) END,
    repacking_type     = CASE WHEN 'repacking_type'     = ANY(v_locked) THEN p.repacking_type     ELSE COALESCE(s.repacking_type, p.repacking_type) END,
    capacities         = CASE WHEN 'capacities'         = ANY(v_locked) THEN p.capacities         ELSE COALESCE(s.capacities, p.capacities) END,
    capacity_ml        = CASE WHEN 'capacity_ml'        = ANY(v_locked) THEN p.capacity_ml        ELSE COALESCE(s.capacity_ml, p.capacity_ml) END,
    min_quantity       = CASE WHEN 'min_quantity'       = ANY(v_locked) THEN p.min_quantity       ELSE COALESCE(s.min_quantity, p.min_quantity) END,
    warranty_months    = CASE WHEN 'warranty_months'    = ANY(v_locked) THEN p.warranty_months    ELSE COALESCE(s.warranty_months, p.warranty_months) END,
    ipi_rate           = CASE WHEN 'ipi_rate'           = ANY(v_locked) THEN p.ipi_rate           ELSE COALESCE(s.ipi_rate, p.ipi_rate) END,
    engraving_type     = CASE WHEN 'engraving_type'     = ANY(v_locked) THEN p.engraving_type     ELSE COALESCE(s.engraving_type, p.engraving_type) END,
    colors             = CASE WHEN 'colors'             = ANY(v_locked) THEN p.colors             ELSE COALESCE(s.colors, p.colors) END,
    origin_country         = CASE WHEN 'origin_country'         = ANY(v_locked) THEN p.origin_country         ELSE COALESCE(s.origin_country, p.origin_country) END,
    combined_sizes         = CASE WHEN 'combined_sizes'         = ANY(v_locked) THEN p.combined_sizes         ELSE COALESCE(s.combined_sizes, p.combined_sizes) END,
    box_image              = CASE WHEN 'box_image'              = ANY(v_locked) THEN p.box_image              ELSE COALESCE(s.box_image, p.box_image) END,
    is_textil              = CASE WHEN 'is_textil'              = ANY(v_locked) THEN p.is_textil              ELSE COALESCE(s.is_textil, p.is_textil) END,
    is_stockout            = CASE WHEN 'is_stockout'            = ANY(v_locked) THEN p.is_stockout            ELSE COALESCE(s.is_stockout, p.is_stockout) END,
    is_online_exclusive    = CASE WHEN 'is_online_exclusive'    = ANY(v_locked) THEN p.is_online_exclusive    ELSE COALESCE(s.is_online_exclusive, p.is_online_exclusive) END,
    is_new                 = CASE WHEN 'is_new'                 = ANY(v_locked) THEN p.is_new                 ELSE COALESCE(s.is_new, p.is_new) END,
    has_colors             = CASE WHEN 'has_colors'             = ANY(v_locked) THEN p.has_colors             ELSE COALESCE(s.has_colors, p.has_colors) END,
    has_sizes              = CASE WHEN 'has_sizes'              = ANY(v_locked) THEN p.has_sizes              ELSE COALESCE(s.has_sizes, p.has_sizes) END,
    allows_personalization = CASE WHEN 'allows_personalization' = ANY(v_locked) THEN p.allows_personalization ELSE COALESCE(s.allows_personalization, p.allows_personalization) END,
    tags                   = CASE WHEN 'tags'                   = ANY(v_locked) THEN p.tags                   ELSE COALESCE(s.tags, p.tags) END,
    materials              = CASE WHEN 'materials'              = ANY(v_locked) THEN p.materials              ELSE COALESCE(s.materials, p.materials) END,
    meta_keywords          = CASE WHEN 'meta_keywords'          = ANY(v_locked) THEN p.meta_keywords          ELSE COALESCE(s.meta_keywords, p.meta_keywords) END,
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
  END IF;

  RETURN jsonb_build_object('success', true, 'product_id', v_pid, 'created', v_is_new,
                            'locked_preserved', v_locked);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_promote_variants_of_parent(p_supplier_id uuid, p_parent_reference text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_pid uuid; v_org uuid; pv RECORD; v_vid uuid; v_count int := 0; v_attrs jsonb;
  v_existing_pid uuid;
BEGIN
  PERFORM set_config('app.write_source','pipeline',true);
  PERFORM set_config('app.bulk_import_mode','true',true);  -- modo pipeline
  SELECT id, organization_id INTO v_pid, v_org FROM public.products
  WHERE supplier_id=p_supplier_id AND supplier_reference=p_parent_reference;
  IF v_pid IS NULL THEN RETURN jsonb_build_object('success',false,'error','produto_pai_nao_promovido','parent',p_parent_reference); END IF;

  FOR pv IN
    SELECT * FROM public.produtos_padronizacao_variantes
    WHERE supplier_id=p_supplier_id AND parent_reference=p_parent_reference AND status='standardized'
  LOOP
    v_attrs := jsonb_strip_nulls(jsonb_build_object('cor', pv.color_name, 'codigo_cor', pv.color_code, 'hex', pv.color_hex));

    SELECT id, product_id INTO v_vid, v_existing_pid FROM public.product_variants WHERE sku = pv.sku;
    IF v_vid IS NULL THEN
      SELECT id, product_id INTO v_vid, v_existing_pid FROM public.product_variants
      WHERE product_id=v_pid AND supplier_sku=pv.supplier_sku;
    END IF;

    IF v_vid IS NULL THEN
      INSERT INTO public.product_variants (product_id, sku, supplier_sku, name, attributes, color_name, color_code, color_hex, color_id, capacity_ml, selected_thumbnail, stock_quantity, is_active, last_sync_at, last_sync_supplier_id)
      VALUES (v_pid, pv.sku, pv.supplier_sku, COALESCE(pv.color_name, pv.sku), v_attrs,
              pv.color_name, pv.color_code, pv.color_hex, pv.color_id, pv.capacity_ml, pv.supplier_thumbnail,
              COALESCE(pv.stock_quantity,0), COALESCE(pv.is_active,true), now(), p_supplier_id)
      ON CONFLICT (sku) DO UPDATE SET
        supplier_sku = EXCLUDED.supplier_sku,
        attributes   = COALESCE(public.product_variants.attributes,'{}'::jsonb) || EXCLUDED.attributes,
        color_name   = COALESCE(EXCLUDED.color_name, public.product_variants.color_name),
        color_code   = COALESCE(EXCLUDED.color_code, public.product_variants.color_code),
        color_hex    = COALESCE(EXCLUDED.color_hex, public.product_variants.color_hex),
        color_id     = COALESCE(EXCLUDED.color_id, public.product_variants.color_id),
        capacity_ml  = COALESCE(EXCLUDED.capacity_ml, public.product_variants.capacity_ml),
        selected_thumbnail = COALESCE(EXCLUDED.selected_thumbnail, public.product_variants.selected_thumbnail),
        stock_quantity = COALESCE(EXCLUDED.stock_quantity, public.product_variants.stock_quantity),
        last_sync_at = now(), last_sync_supplier_id = EXCLUDED.last_sync_supplier_id
      RETURNING id INTO v_vid;
    ELSE
      UPDATE public.product_variants SET
        attributes = COALESCE(attributes,'{}'::jsonb) || v_attrs,
        color_name=COALESCE(pv.color_name,color_name), color_code=COALESCE(pv.color_code,color_code),
        color_hex=COALESCE(pv.color_hex,color_hex), color_id=COALESCE(pv.color_id,color_id),
        capacity_ml=COALESCE(pv.capacity_ml,capacity_ml), selected_thumbnail=COALESCE(pv.supplier_thumbnail,selected_thumbnail),
        stock_quantity=COALESCE(pv.stock_quantity,stock_quantity), last_sync_at=now(), last_sync_supplier_id=p_supplier_id
      WHERE id=v_vid;
    END IF;

    IF pv.cost_price IS NOT NULL THEN
      INSERT INTO public.variant_supplier_sources (
        organization_id, variant_id, supplier_id, cost_price, supplier_sku, supplier_color_code, supplier_color_name,
        is_active, source, last_synced_at,
        quantity, stock_main_warehouse,
        cost_price_1, cost_price_2, cost_price_3, cost_price_4, cost_price_5,
        min_qty_1, min_qty_2, min_qty_3, min_qty_4, min_qty_5,
        next_quantity_1, next_quantity_2, next_quantity_3, next_date_1, next_date_2, next_date_3,
        sale_multiplier, supplier_images, supplier_videos, supplier_thumbnail)
      VALUES (
        v_org, v_vid, p_supplier_id, pv.cost_price, pv.supplier_sku, pv.color_code, pv.color_name,
        true, 'silver', now(),
        pv.stock_quantity, COALESCE(pv.stock_quantity,0),
        pv.cost_price_1, pv.cost_price_2, pv.cost_price_3, pv.cost_price_4, pv.cost_price_5,
        pv.min_qty_1, pv.min_qty_2, pv.min_qty_3, pv.min_qty_4, pv.min_qty_5,
        pv.next_quantity_1, pv.next_quantity_2, pv.next_quantity_3, pv.next_date_1, pv.next_date_2, pv.next_date_3,
        pv.sale_multiplier, pv.supplier_images, pv.supplier_videos, pv.supplier_thumbnail)
      ON CONFLICT (variant_id, supplier_id) DO UPDATE SET
        cost_price          = EXCLUDED.cost_price,
        supplier_sku        = EXCLUDED.supplier_sku,
        supplier_color_code = EXCLUDED.supplier_color_code,
        supplier_color_name = EXCLUDED.supplier_color_name,
        is_active           = EXCLUDED.is_active,
        source              = EXCLUDED.source,
        last_synced_at      = EXCLUDED.last_synced_at,
        quantity             = COALESCE(EXCLUDED.quantity, public.variant_supplier_sources.quantity),
        stock_main_warehouse = COALESCE(EXCLUDED.stock_main_warehouse, public.variant_supplier_sources.stock_main_warehouse),
        cost_price_1 = COALESCE(EXCLUDED.cost_price_1, public.variant_supplier_sources.cost_price_1),
        cost_price_2 = COALESCE(EXCLUDED.cost_price_2, public.variant_supplier_sources.cost_price_2),
        cost_price_3 = COALESCE(EXCLUDED.cost_price_3, public.variant_supplier_sources.cost_price_3),
        cost_price_4 = COALESCE(EXCLUDED.cost_price_4, public.variant_supplier_sources.cost_price_4),
        cost_price_5 = COALESCE(EXCLUDED.cost_price_5, public.variant_supplier_sources.cost_price_5),
        min_qty_1 = COALESCE(EXCLUDED.min_qty_1, public.variant_supplier_sources.min_qty_1),
        min_qty_2 = COALESCE(EXCLUDED.min_qty_2, public.variant_supplier_sources.min_qty_2),
        min_qty_3 = COALESCE(EXCLUDED.min_qty_3, public.variant_supplier_sources.min_qty_3),
        min_qty_4 = COALESCE(EXCLUDED.min_qty_4, public.variant_supplier_sources.min_qty_4),
        min_qty_5 = COALESCE(EXCLUDED.min_qty_5, public.variant_supplier_sources.min_qty_5),
        next_quantity_1 = COALESCE(EXCLUDED.next_quantity_1, public.variant_supplier_sources.next_quantity_1),
        next_quantity_2 = COALESCE(EXCLUDED.next_quantity_2, public.variant_supplier_sources.next_quantity_2),
        next_quantity_3 = COALESCE(EXCLUDED.next_quantity_3, public.variant_supplier_sources.next_quantity_3),
        next_date_1 = COALESCE(EXCLUDED.next_date_1, public.variant_supplier_sources.next_date_1),
        next_date_2 = COALESCE(EXCLUDED.next_date_2, public.variant_supplier_sources.next_date_2),
        next_date_3 = COALESCE(EXCLUDED.next_date_3, public.variant_supplier_sources.next_date_3),
        sale_multiplier    = COALESCE(EXCLUDED.sale_multiplier, public.variant_supplier_sources.sale_multiplier),
        supplier_images    = COALESCE(EXCLUDED.supplier_images, public.variant_supplier_sources.supplier_images),
        supplier_videos    = COALESCE(EXCLUDED.supplier_videos, public.variant_supplier_sources.supplier_videos),
        supplier_thumbnail = COALESCE(EXCLUDED.supplier_thumbnail, public.variant_supplier_sources.supplier_thumbnail);
    END IF;

    UPDATE public.produtos_padronizacao_variantes SET status='promoted', variant_id=v_vid, updated_at=now() WHERE id=pv.id;

    IF pv.raw_id IS NOT NULL THEN
      UPDATE public.supplier_products_raw
         SET status='processed', processed_at=now(), product_id=v_pid, variant_id=v_vid
       WHERE id=pv.raw_id AND status <> 'processed';
    END IF;

    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('success',true,'product_id',v_pid,'variantes_promovidas',v_count);
END;
$function$;;
