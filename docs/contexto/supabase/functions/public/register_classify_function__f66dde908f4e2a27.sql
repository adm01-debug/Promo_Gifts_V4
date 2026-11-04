CREATE OR REPLACE FUNCTION public.register_classify_function(p_function_name character varying, p_is_field character varying, p_description text DEFAULT NULL::text, p_priority integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_id INTEGER;
BEGIN
    -- Validar que a função existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = p_function_name
    ) THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', format('Função %s não existe no banco de dados', p_function_name)
        );
    END IF;
    
    -- Inserir ou atualizar
    INSERT INTO classify_functions_registry (function_name, is_field, description, priority)
    VALUES (p_function_name, p_is_field, p_description, p_priority)
    ON CONFLICT (function_name) DO UPDATE SET
        is_field = EXCLUDED.is_field,
        description = EXCLUDED.description,
        priority = EXCLUDED.priority,
        is_active = TRUE
    RETURNING id INTO v_id;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'id', v_id,
        'function_name', p_function_name,
        'message', 'Função registrada com sucesso. Será usada automaticamente pelo trigger.'
    );
END;
$function$
