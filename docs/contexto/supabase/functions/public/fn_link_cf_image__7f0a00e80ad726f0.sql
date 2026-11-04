CREATE OR REPLACE FUNCTION public.fn_link_cf_image(p_img_id uuid, p_cf_id text, p_url_cdn text, p_product_id uuid DEFAULT NULL::uuid, p_is_primary boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Atualizar product_images (mantém URL CF bruta)
  UPDATE product_images
  SET
    cloudflare_image_id = p_cf_id,
    url_cdn             = p_url_cdn,
    updated_at          = now()
  WHERE id = p_img_id;

  -- Se for imagem principal, atualizar products.primary_image_url
  -- FIX 2026-06-09: usa url_cdn CF direto (remove conversão proxy Workers.dev)
  IF p_is_primary AND p_product_id IS NOT NULL THEN
    UPDATE products
    SET
      primary_image_url = p_url_cdn,
      updated_at        = now()
    WHERE id = p_product_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'img_id', p_img_id, 'cf_id', p_cf_id);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM, 'img_id', p_img_id);
END;
$function$
