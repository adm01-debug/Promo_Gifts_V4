CREATE OR REPLACE FUNCTION public.get_commemorative_dates_by_variant(p_variant_id uuid)
 RETURNS TABLE(id uuid, name text, slug text, date_day integer, date_month integer, category text, icon_name text, color_hex text, is_featured boolean, custom_description text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
    SELECT 
        cd.id,
        cd.name,
        cd.slug,
        cd.date_day,
        cd.date_month,
        cd.category,
        cd.icon_name,
        cd.color_hex,
        vcd.is_featured,
        vcd.custom_description
    FROM variant_commemorative_dates vcd
    JOIN commemorative_dates cd ON cd.id = vcd.commemorative_date_id
    JOIN product_variants pv ON pv.id = p_variant_id
    WHERE vcd.variant_id = p_variant_id
       OR (vcd.product_id = pv.product_id AND vcd.variant_id IS NULL)
    ORDER BY cd.date_month, cd.date_day;
$function$
