CREATE OR REPLACE FUNCTION public.normalize_product_name(p_name text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN INITCAP(
        TRIM(
            REGEXP_REPLACE(
                REGEXP_REPLACE(p_name, '\s+', ' ', 'g'),
                '^\d+\.\s*', ''
            )
        )
    );
END;
$function$
