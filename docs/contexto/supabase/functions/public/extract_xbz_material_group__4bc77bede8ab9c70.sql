CREATE OR REPLACE FUNCTION public.extract_xbz_material_group(p_nome text, p_descricao text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_group TEXT;
BEGIN
    SELECT material_group INTO v_group
    FROM extract_xbz_material(p_nome, p_descricao)
    ORDER BY 
        CASE confidence 
            WHEN 'alta' THEN 1 
            WHEN 'média' THEN 2 
            ELSE 3 
        END
    LIMIT 1;
    
    RETURN v_group;
END;
$function$
