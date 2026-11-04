CREATE OR REPLACE FUNCTION public.fn_get_asia_product_dims_for_kit(p_kit_product_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'altura',      (spr.raw_data->'atributos'->>'altura'),
    'largura',     (spr.raw_data->'atributos'->>'largura'),
    'comprimento', (spr.raw_data->'atributos'->>'comprimento'),
    'peso',        (spr.raw_data->'atributos'->>'peso_produto'),
    'ref',         spr.supplier_reference
  )
  FROM supplier_products_raw spr
  JOIN suppliers s ON s.id = spr.supplier_id AND s.code = 'ASIA'
  WHERE spr.product_id = p_kit_product_id
    AND spr.raw_data->'atributos' IS NOT NULL
  LIMIT 1;
$function$
