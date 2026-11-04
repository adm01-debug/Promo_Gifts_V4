CREATE OR REPLACE FUNCTION public.get_all_material_groups_safe()
 RETURNS TABLE(id uuid, organization_id uuid, name text, slug text, description text, sort_order integer, is_active boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
    SELECT 
        id, 
        organization_id, 
        name::TEXT, 
        slug::TEXT, 
        description::TEXT, 
        sort_order, 
        is_active
    FROM material_groups
    WHERE is_active = true
    ORDER BY sort_order, name;
$function$
