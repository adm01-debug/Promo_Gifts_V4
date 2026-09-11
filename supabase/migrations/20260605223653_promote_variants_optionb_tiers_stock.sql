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
