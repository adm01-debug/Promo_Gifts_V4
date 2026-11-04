CREATE OR REPLACE FUNCTION public.get_upcoming_commemorative_dates(p_days_ahead integer DEFAULT 60)
 RETURNS TABLE(id uuid, name text, slug text, date_day integer, date_month integer, is_fixed_date boolean, category text, target_audience text, icon_name text, color_hex text, campaign_start_days integer, days_until integer, is_in_campaign boolean)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    current_day INT := EXTRACT(DAY FROM CURRENT_DATE);
    current_month INT := EXTRACT(MONTH FROM CURRENT_DATE);
    current_year INT := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
    RETURN QUERY
    SELECT 
        cd.id,
        cd.name,
        cd.slug,
        cd.date_day,
        cd.date_month,
        cd.is_fixed_date,
        cd.category,
        cd.target_audience,
        cd.icon_name,
        cd.color_hex,
        cd.campaign_start_days,
        -- Calcular dias até a data
        CASE 
            WHEN cd.is_fixed_date AND cd.date_day IS NOT NULL THEN
                (make_date(
                    CASE 
                        WHEN cd.date_month < current_month OR 
                             (cd.date_month = current_month AND cd.date_day < current_day)
                        THEN current_year + 1 
                        ELSE current_year 
                    END,
                    cd.date_month,
                    cd.date_day
                ) - CURRENT_DATE)::INT
            ELSE NULL
        END AS days_until,
        -- Verificar se está no período de campanha
        CASE 
            WHEN cd.is_fixed_date AND cd.date_day IS NOT NULL THEN
                (make_date(
                    CASE 
                        WHEN cd.date_month < current_month OR 
                             (cd.date_month = current_month AND cd.date_day < current_day)
                        THEN current_year + 1 
                        ELSE current_year 
                    END,
                    cd.date_month,
                    cd.date_day
                ) - CURRENT_DATE)::INT <= cd.campaign_start_days
            ELSE FALSE
        END AS is_in_campaign
    FROM commemorative_dates cd
    WHERE cd.is_active = TRUE
    ORDER BY 
        CASE 
            WHEN cd.date_month >= current_month THEN cd.date_month
            ELSE cd.date_month + 12
        END,
        cd.date_day NULLS LAST;
END;
$function$
