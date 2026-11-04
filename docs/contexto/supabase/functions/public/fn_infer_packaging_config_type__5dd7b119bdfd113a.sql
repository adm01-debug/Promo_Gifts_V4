CREATE OR REPLACE FUNCTION public.fn_infer_packaging_config_type(p_product_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p.shape_type = 'cylindrical' THEN 'bottles'
    WHEN p.category_name ~* 'vidro|cerâmic|ceramic|porcelan|cristal|louça'
      OR (COALESCE(p.materials::text,'')||COALESCE(p.auto_material,'')) ~* 'vidro|cerâmic|ceramic|porcelan|cristal' THEN 'fragile'
    WHEN p.category_name ~* 'eletrôni|eletroni|relógio|relogio|smartwatch|power\s*bank|powerbank|fone|speaker|caixa de som|wireless|bluetooth' THEN 'precision'
    ELSE 'default'
  END
  FROM products p WHERE p.id = p_product_id;
$function$
