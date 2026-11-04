CREATE OR REPLACE FUNCTION public.fn_spot_eu_diff_get_refs(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(ref text, all_images text, main_image text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT ON (raw_data->>'ProdReference')
    raw_data->>'ProdReference'  AS ref,
    raw_data->>'AllImageList'   AS all_images,
    raw_data->>'MainImage'      AS main_image
  FROM supplier_products_raw
  WHERE supplier_id = 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'
    AND LEFT(raw_data->>'ProdReference', 2) IN ('91','92','93','94','95','97','98','99')
    AND raw_data->>'IsStockOut' = 'false'
  ORDER BY raw_data->>'ProdReference'
  LIMIT p_limit OFFSET p_offset;
$function$
