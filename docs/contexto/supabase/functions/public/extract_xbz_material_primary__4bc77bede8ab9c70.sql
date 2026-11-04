CREATE OR REPLACE FUNCTION public.extract_xbz_material_primary(p_nome text, p_descricao text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_material TEXT;
BEGIN
    SELECT material_name INTO v_material
    FROM extract_xbz_material(p_nome, p_descricao)
    ORDER BY 
        CASE confidence 
            WHEN 'alta' THEN 1 
            WHEN 'média' THEN 2 
            ELSE 3 
        END
    LIMIT 1;
    
    RETURN v_material;
END;
$function$
