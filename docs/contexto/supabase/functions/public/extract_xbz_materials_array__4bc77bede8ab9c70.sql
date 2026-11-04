CREATE OR REPLACE FUNCTION public.extract_xbz_materials_array(p_nome text, p_descricao text DEFAULT NULL::text)
 RETURNS text[]
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN ARRAY(
        SELECT DISTINCT material_name
        FROM extract_xbz_material(p_nome, p_descricao)
        ORDER BY material_name
    );
END;
$function$
