CREATE OR REPLACE FUNCTION public.fn_spot_enrich_image_colors()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_updated int := 0;
  v_skipped int := 0;
BEGIN
  -- Atualizar color_id e variant_id para imagens onde a cor está no filename
  -- Tipos: main, gallery, logo (set/ambient/box/pouch são de produto, sem cor)
  WITH updates AS (
    SELECT
      pi.id as img_id,
      pv.id as variant_id,
      pv.color_id
    FROM product_images pi
    JOIN products p ON p.id = pi.product_id
    JOIN suppliers s ON s.id = p.supplier_id
    JOIN product_variants pv ON pv.product_id = pi.product_id
      AND pv.color_code = substring(pi.filename FROM '^\d+_(\d+)')
    WHERE s.code = 'STRICKER'
      AND pi.color_id IS NULL
      AND pi.image_type IN ('main','gallery','logo')
      AND substring(pi.filename FROM '^\d+_(\d+)') IS NOT NULL
  )
  UPDATE product_images pi
  SET 
    color_id   = u.color_id,
    variant_id = u.variant_id,
    updated_at = now()
  FROM updates u
  WHERE pi.id = u.img_id
    AND u.color_id IS NOT NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Contar os que ficaram sem correspondência
  SELECT COUNT(*) INTO v_skipped
  FROM product_images pi
  JOIN products p ON p.id=pi.product_id
  JOIN suppliers s ON s.id=p.supplier_id
  WHERE s.code='STRICKER'
    AND pi.image_type IN ('main','gallery','logo')
    AND pi.color_id IS NULL;

  RETURN jsonb_build_object(
    'updated', v_updated,
    'still_without_color', v_skipped,
    'ran_at', now()
  );
END;
$function$
