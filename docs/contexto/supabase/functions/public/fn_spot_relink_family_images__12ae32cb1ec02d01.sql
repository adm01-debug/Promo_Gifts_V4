CREATE OR REPLACE FUNCTION public.fn_spot_relink_family_images()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_relinked integer := 0;
BEGIN
  PERFORM set_config('app.bulk_import_mode', 'true', true);

  WITH candidatos AS (
    SELECT p.id,
      'spot-' || REPLACE(LOWER(SPLIT_PART(SPLIT_PART(p.primary_image_url,'/produtos/',2),'.',1)), '-', '_') AS cf_id
    FROM products p
    WHERE p.supplier_id = 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'
      AND p.is_active = true
      AND p.primary_image_url IS NOT NULL
      AND p.primary_image_url NOT LIKE '%imagedelivery%'
      AND p.primary_image_url LIKE '%spotgifts.com.br%'
  ),
  validos AS (
    SELECT c.id, c.cf_id
    FROM candidatos c
    WHERE EXISTS (SELECT 1 FROM product_images pi 
                  WHERE pi.cloudflare_image_id = c.cf_id AND pi.is_active = true)
  ),
  updated AS (
    UPDATE products p
    SET primary_image_url = 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/' || v.cf_id || '/public',
        og_image_url      = 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/' || v.cf_id || '/public',
        locked_fields = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(p.locked_fields,'{}') || ARRAY['primary_image_url']))),
        updated_at = NOW()
    FROM validos v
    WHERE p.id = v.id
    RETURNING p.id
  )
  SELECT COUNT(*) INTO v_relinked FROM updated;

  RETURN jsonb_build_object('relinked', v_relinked, 'ts', now());
END;
$function$
