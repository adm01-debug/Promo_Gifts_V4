CREATE OR REPLACE FUNCTION public.get_active_commemorative_dates()
 RETURNS TABLE(id uuid, name text, slug text, date_day integer, date_month integer, formatted_date text, category text, icon_name text, color_hex text, days_until integer, campaign_start_days integer, is_featured boolean, color_count bigint, product_count bigint)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_day INT := EXTRACT(DAY FROM CURRENT_DATE);
    v_month INT := EXTRACT(MONTH FROM CURRENT_DATE);
    v_year INT := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
    RETURN QUERY
    SELECT 
        cd.id,
        cd.name,
        cd.slug,
        cd.date_day,
        cd.date_month,
        CASE 
            WHEN cd.is_fixed_date AND cd.date_day IS NOT NULL 
            THEN LPAD(cd.date_day::TEXT, 2, '0') || '/' || LPAD(cd.date_month::TEXT, 2, '0')
            ELSE cd.variable_date_rule
        END,
        cd.category,
        cd.icon_name,
        cd.color_hex,
        CASE 
            WHEN cd.is_fixed_date AND cd.date_day IS NOT NULL THEN
                (make_date(
                    CASE WHEN cd.date_month < v_month OR (cd.date_month = v_month AND cd.date_day < v_day)
                    THEN v_year + 1 ELSE v_year END, cd.date_month, cd.date_day
                ) - CURRENT_DATE)::INT
            ELSE NULL
        END,
        cd.campaign_start_days,
        cd.is_featured,
        (SELECT COUNT(*) FROM commemorative_date_colors cdc WHERE cdc.commemorative_date_id = cd.id),
        0::BIGINT AS product_count
    FROM commemorative_dates cd
    WHERE cd.is_active = TRUE
      AND (
          cd.is_fixed_date = FALSE
          OR (make_date(
              CASE WHEN cd.date_month < v_month OR (cd.date_month = v_month AND cd.date_day < v_day)
                   THEN v_year + 1 ELSE v_year END,
              cd.date_month, cd.date_day
          ) - CURRENT_DATE)::INT <= cd.campaign_start_days
      )
    ORDER BY cd.date_month, cd.date_day NULLS LAST;
END;
$function$
