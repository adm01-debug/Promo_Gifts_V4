CREATE OR REPLACE FUNCTION public.get_all_material_types_safe()
 RETURNS TABLE(id uuid, organization_id uuid, group_id uuid, name text, slug text, description text, properties jsonb, display_order integer, is_active boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
    SELECT 
        id, 
        organization_id, 
        group_id, 
        name::TEXT, 
        slug::TEXT, 
        description::TEXT, 
        properties, 
        display_order, 
        is_active
    FROM material_types
    WHERE is_active = true
    ORDER BY name;
$function$
