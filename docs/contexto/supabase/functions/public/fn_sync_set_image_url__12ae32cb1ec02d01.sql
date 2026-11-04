CREATE OR REPLACE FUNCTION public.fn_sync_set_image_url()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_product_id uuid;
  v_new_url    text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_product_id := OLD.product_id;
  ELSE
    v_product_id := NEW.product_id;
    IF NEW.image_type != 'set' AND (TG_OP = 'INSERT' OR OLD.image_type != 'set') THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT url_cdn INTO v_new_url
  FROM product_images
  WHERE product_id = v_product_id
    AND image_type = 'set'
    AND is_active = true
  ORDER BY display_order ASC, created_at ASC
  LIMIT 1;

  UPDATE products
  SET set_image_url = v_new_url
  WHERE id = v_product_id
    AND (set_image_url IS DISTINCT FROM v_new_url);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[fn_sync_set_image_url] Erro product_id=%: %', v_product_id, SQLERRM;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$
