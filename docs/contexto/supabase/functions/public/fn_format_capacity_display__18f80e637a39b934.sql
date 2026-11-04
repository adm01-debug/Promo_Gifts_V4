CREATE OR REPLACE FUNCTION public.fn_format_capacity_display(p_capacity_ml integer)
 RETURNS character varying
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
    IF p_capacity_ml IS NULL THEN
        RETURN NULL;
    END IF;
    
    IF p_capacity_ml >= 1000 THEN
        IF p_capacity_ml % 1000 = 0 THEN
            RETURN (p_capacity_ml / 1000)::TEXT || ' L';
        ELSE
            RETURN REPLACE((p_capacity_ml / 1000.0)::DECIMAL(10,1)::TEXT, '.', ',') || ' L';
        END IF;
    ELSE
        RETURN p_capacity_ml::TEXT || ' mL';
    END IF;
END;
$function$
