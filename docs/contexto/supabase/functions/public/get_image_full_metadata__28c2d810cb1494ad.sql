CREATE OR REPLACE FUNCTION public.get_image_full_metadata(p_filename text, p_supplier_code character varying DEFAULT 'spot'::character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_internal RECORD;
    v_result JSONB;
    v_url_base TEXT;
BEGIN
    -- Obter tipo interno
    SELECT * INTO v_internal
    FROM get_internal_image_type(p_filename, p_supplier_code)
    LIMIT 1;
    
    -- Definir URL base por fornecedor
    CASE upper(p_supplier_code)
        WHEN 'SPOT' THEN v_url_base := 'https://www.spotgifts.com.br/fotos/produtos/';
        ELSE v_url_base := '';
    END CASE;
    
    -- Montar resultado
    v_result := v_internal.parsed_data || jsonb_build_object(
        'image_type_id', v_internal.image_type_id,
        'image_type_code', v_internal.image_type_code,
        'image_type_name', v_internal.image_type_name,
        'category', v_internal.category,
        'display_priority', v_internal.display_priority,
        'url_base', v_url_base,
        'url_full', v_url_base || p_filename
    );
    
    RETURN v_result;
END;
$function$
