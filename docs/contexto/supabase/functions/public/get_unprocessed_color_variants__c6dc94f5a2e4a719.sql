CREATE OR REPLACE FUNCTION public.get_unprocessed_color_variants(p_offset integer DEFAULT 0, p_limit integer DEFAULT 50, p_color_filter text DEFAULT NULL::text)
 RETURNS TABLE(variant_id uuid, product_sku text, variant_sku text, image_url text, supplier_color_name text, current_variation_id uuid, current_color_name text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT 
    pv.id as variant_id,
    p.sku as product_sku,
    pv.sku as variant_sku,
    pi.url_cdn as image_url,
    pv.attributes->>'cor' as supplier_color_name,
    pv.color_id as current_variation_id,
    cv.name as current_color_name
  FROM product_variants pv
  JOIN products p ON pv.product_id = p.id
  JOIN suppliers s ON p.supplier_id = s.id
  JOIN product_images pi ON pi.variant_id = pv.id AND pi.is_primary = true
  LEFT JOIN color_variations cv ON pv.color_id = cv.id
  LEFT JOIN color_analysis_staging cas ON cas.variant_id = pv.id
  WHERE s.code = 'XBZ'
    AND cas.id IS NULL  -- Não processadas ainda
    AND pi.url_cdn IS NOT NULL
    AND (p_color_filter IS NULL OR pv.attributes->>'cor' = p_color_filter)
  ORDER BY pv.attributes->>'cor', p.sku
  OFFSET p_offset
  LIMIT p_limit;
$function$
