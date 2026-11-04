CREATE OR REPLACE FUNCTION public.get_material_types_by_group_slug(p_group_slug text)
 RETURNS TABLE(id uuid, organization_id uuid, group_id uuid, name text, slug text, description text, properties jsonb, display_order integer, is_active boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
    SELECT 
        mt.id, 
        mt.organization_id, 
        mt.group_id, 
        mt.name::TEXT, 
        mt.slug::TEXT, 
        mt.description::TEXT, 
        mt.properties, 
        mt.display_order, 
        mt.is_active
    FROM material_types mt
    JOIN material_groups mg ON mg.id = mt.group_id
    WHERE mg.slug = p_group_slug
      AND mt.is_active = true
      AND mg.is_active = true
    ORDER BY mt.display_order, mt.name;
$function$
