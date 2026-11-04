CREATE OR REPLACE FUNCTION public.get_product_composition(p_product_id uuid)
 RETURNS TABLE(material_name character varying, group_name character varying, part character varying, percentage numeric)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT mt.name, mg.name, pm.part, pm.percentage
  FROM product_materials pm
  JOIN material_types mt ON mt.id = pm.material_id
  JOIN material_groups mg ON mg.id = mt.group_id
  WHERE pm.product_id = p_product_id AND pm.is_active = true
  ORDER BY pm.sort_order;
END;
$function$
