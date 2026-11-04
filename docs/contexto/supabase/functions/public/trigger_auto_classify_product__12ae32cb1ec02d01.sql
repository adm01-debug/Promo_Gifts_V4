CREATE OR REPLACE FUNCTION public.trigger_auto_classify_product()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_func RECORD;
    v_result JSONB;
    v_category_id UUID;
    v_is_match BOOLEAN;
    v_sql TEXT;
BEGIN
    -- ========================================================================
    -- REGRA: Só classificar se category_id for NULL
    -- ========================================================================
    
    IF NEW.category_id IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    -- ========================================================================
    -- LOOP DINÂMICO: Executar funções registradas por ordem de prioridade
    -- ========================================================================
    
    FOR v_func IN 
        SELECT function_name, is_field
        FROM classify_functions_registry
        WHERE is_active = TRUE
        ORDER BY priority ASC
    LOOP
        BEGIN
            -- Construir e executar SQL dinâmico
            v_sql := format('SELECT %I($1)', v_func.function_name);
            EXECUTE v_sql INTO v_result USING NEW.name;
            
            -- Verificar se é match (campo is_X = TRUE)
            v_is_match := (v_result->>v_func.is_field)::BOOLEAN;
            
            IF v_is_match = TRUE THEN
                v_category_id := (v_result->>'category_id')::UUID;
                
                IF v_category_id IS NOT NULL THEN
                    NEW.category_id := v_category_id;
                    -- Encontrou match, sair do loop
                    EXIT;
                END IF;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log de erro (opcional) - continua para próxima função
            RAISE WARNING '[AUTO-CLASSIFY] Erro na função %: %', v_func.function_name, SQLERRM;
            CONTINUE;
        END;
    END LOOP;
    
    RETURN NEW;
    
END;
$function$
