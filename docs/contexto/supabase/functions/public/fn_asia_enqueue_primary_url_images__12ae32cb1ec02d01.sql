CREATE OR REPLACE FUNCTION public.fn_asia_enqueue_primary_url_images()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inserted integer;
BEGIN
  INSERT INTO asia_image_import_queue (
    codigo_pai,
    url_original,
    cf_image_id_canonical,
    image_type,
    display_order,
    product_id,
    status
  )
  SELECT
    lower(regexp_replace(p.supplier_reference, '[^a-zA-Z0-9]', '', 'g')) AS codigo_pai,
    p.primary_image_url                                                    AS url_original,
    'asia-' || lower(regexp_replace(p.supplier_reference, '[^a-zA-Z0-9]', '', 'g')) || '-01'
                                                                           AS cf_image_id_canonical,
    'main'                                                                 AS image_type,
    1                                                                      AS display_order,
    p.id                                                                   AS product_id,
    'pending'
  FROM products p
  WHERE p.supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'
    AND p.is_active = true
    AND p.primary_image_url IS NOT NULL
    AND p.primary_image_url NOT LIKE '%imagedelivery%'
    AND NOT EXISTS (
      SELECT 1 FROM asia_image_import_queue q
      WHERE q.product_id = p.id
        AND q.status != 'done'
    )
  ON CONFLICT (url_original) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'ts',       now()
  );
END;
$function$
