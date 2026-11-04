CREATE OR REPLACE FUNCTION public.fn_get_product_dates(p_product_id uuid)
 RETURNS TABLE(date_id uuid, date_name text, date_day integer, date_month integer, target_audience text, is_featured boolean, source character varying)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        cd.id,
        cd.name::TEXT,
        cd.date_day,
        cd.date_month,
        cd.target_audience::TEXT,
        pcd.is_featured,
        pcd.source
    FROM product_commemorative_dates pcd
    JOIN commemorative_dates cd ON cd.id = pcd.commemorative_date_id
    WHERE pcd.product_id = p_product_id AND pcd.is_active = TRUE
    ORDER BY cd.date_month, cd.date_day;
END;
$function$
