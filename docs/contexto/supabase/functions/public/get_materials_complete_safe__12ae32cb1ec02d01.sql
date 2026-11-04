CREATE OR REPLACE FUNCTION public.get_materials_complete_safe()
 RETURNS TABLE(material_id uuid, material_name text, material_slug text, material_description text, group_id uuid, group_name text, group_slug text, display_order integer, is_active boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
    SELECT 
        mt.id AS material_id,
        mt.name::TEXT AS material_name,
        mt.slug::TEXT AS material_slug,
        mt.description::TEXT AS material_description,
        mg.id AS group_id,
        mg.name::TEXT AS group_name,
        mg.slug::TEXT AS group_slug,
        mt.display_order,
        mt.is_active
    FROM material_types mt
    JOIN material_groups mg ON mg.id = mt.group_id
    WHERE mt.is_active = true
      AND mg.is_active = true
    ORDER BY mg.sort_order, mg.name, mt.display_order, mt.name;
$function$
