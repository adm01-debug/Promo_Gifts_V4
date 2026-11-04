CREATE OR REPLACE FUNCTION public.get_commemorative_dates_by_product(p_product_id uuid)
 RETURNS TABLE(id uuid, name text, slug text, date_day integer, date_month integer, category text, icon_name text, color_hex text, variant_id uuid, variant_name text, variant_color text, is_product_wide boolean, is_featured boolean, custom_description text)
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
        pv.id AS variant_id,
        pv.name AS variant_name,
        pv.color_name AS variant_color,
        (vcd.variant_id IS NULL) AS is_product_wide,
        vcd.is_featured,
        vcd.custom_description
    FROM variant_commemorative_dates vcd
    JOIN commemorative_dates cd ON cd.id = vcd.commemorative_date_id
    LEFT JOIN product_variants pv ON pv.id = vcd.variant_id
    WHERE vcd.product_id = p_product_id
       OR pv.product_id = p_product_id
    ORDER BY cd.date_month, cd.date_day;
$function$
