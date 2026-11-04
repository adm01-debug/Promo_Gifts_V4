CREATE OR REPLACE FUNCTION public.enable_classify_function(p_function_name character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE classify_functions_registry
    SET is_active = TRUE
    WHERE function_name = p_function_name;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', format('Função %s não encontrada no registro', p_function_name)
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'function_name', p_function_name,
        'message', 'Função reativada. Será chamada pelo trigger.'
    );
END;
$function$
