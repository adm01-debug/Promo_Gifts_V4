CREATE OR REPLACE FUNCTION public.fn_asia_complete_image_upload(p_queue_id uuid, p_cf_image_id text, p_cf_filename text, p_cf_url_cdn text, p_cf_width integer DEFAULT NULL::integer, p_cf_height integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_q   RECORD;
  v_img UUID;
BEGIN
  SELECT * INTO v_q FROM public.asia_image_import_queue WHERE id = p_queue_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'queue_item_not_found');
  END IF;

  BEGIN
    INSERT INTO public.product_images (
      product_id, variant_id, cloudflare_image_id, url_cdn, url_original, filename,
      image_type, is_primary, display_order, source_supplier,
      width_px, height_px, is_active, organization_id
    )
    VALUES (
      v_q.product_id, v_q.variant_id,
      p_cf_image_id, p_cf_url_cdn, v_q.url_original, p_cf_filename,
      v_q.image_type, v_q.image_type = 'main', v_q.display_order, 'ASIA',
      p_cf_width, p_cf_height, true, '5db5aee1-064b-4ef4-9193-345dcd8274ea'
    )
    ON CONFLICT (product_id, filename)
      WHERE (is_active = true AND filename IS NOT NULL)
    DO UPDATE SET
      cloudflare_image_id = EXCLUDED.cloudflare_image_id,
      url_cdn             = EXCLUDED.url_cdn,
      url_original        = EXCLUDED.url_original,
      variant_id          = COALESCE(product_images.variant_id, EXCLUDED.variant_id),
      display_order       = EXCLUDED.display_order,
      width_px            = COALESCE(EXCLUDED.width_px,  product_images.width_px),
      height_px           = COALESCE(EXCLUDED.height_px, product_images.height_px),
      updated_at          = now()
    RETURNING id INTO v_img;
  EXCEPTION WHEN unique_violation THEN
    SELECT id INTO v_img FROM public.product_images
    WHERE cloudflare_image_id = p_cf_image_id AND is_active = true LIMIT 1;
  END;

  -- PATCH: atualizar primary_image_url mesmo quando já é URL externa (não CF)
  IF v_q.image_type = 'main' THEN
    UPDATE public.products
    SET primary_image_url = p_cf_url_cdn, updated_at = now()
    WHERE id = v_q.product_id
      AND (primary_image_url IS NULL
           OR primary_image_url NOT LIKE '%imagedelivery%');
  END IF;

  UPDATE public.asia_image_import_queue
  SET status              = 'done',
      cloudflare_image_id = p_cf_image_id,
      cf_url_cdn          = p_cf_url_cdn,
      cf_filename         = p_cf_filename,
      updated_at          = now()
  WHERE id = p_queue_id;

  RETURN jsonb_build_object('ok', true, 'image_id', v_img, 'cf_image_id', p_cf_image_id);
END;
$function$
