CREATE OR REPLACE FUNCTION public.search_notebooks_by_size(p_width numeric DEFAULT NULL::numeric, p_height numeric DEFAULT NULL::numeric, p_format_code character varying DEFAULT NULL::character varying, p_tolerance numeric DEFAULT 0.5)
 RETURNS TABLE(product_id uuid, product_name character varying, format_code character varying, width_cm numeric, height_cm numeric)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        pf.code,
        COALESCE(pns.width_cm, pf.width_cm),
        COALESCE(pns.height_cm, pf.height_cm)
    FROM products p
    JOIN product_notebook_specs pns ON p.id = pns.product_id
    LEFT JOIN paper_formats pf ON pns.format_id = pf.id
    WHERE 
        (p_format_code IS NULL OR pf.code = p_format_code)
        AND (
            p_width IS NULL 
            OR ABS(COALESCE(pns.width_cm, pf.width_cm) - p_width) <= p_tolerance
        )
        AND (
            p_height IS NULL 
            OR ABS(COALESCE(pns.height_cm, pf.height_cm) - p_height) <= p_tolerance
        );
END;
$function$
