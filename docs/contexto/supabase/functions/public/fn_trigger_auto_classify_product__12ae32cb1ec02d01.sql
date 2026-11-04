CREATE OR REPLACE FUNCTION public.fn_trigger_auto_classify_product()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
    v_category_id UUID;
BEGIN
    -- ========================================
    -- CONDIÇÕES PARA EXECUTAR:
    -- 1. Nome deve existir
    -- 2. Categoria deve ser NULL (não sobrescreve)
    -- 3. Apenas em INSERT ou UPDATE do campo name
    -- ========================================
    
    -- Se já tem categoria, não faz nada
    IF NEW.category_id IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    -- Se não tem nome, não faz nada
    IF NEW.name IS NULL OR TRIM(NEW.name) = '' THEN
        RETURN NEW;
    END IF;
    
    -- Em UPDATE, só executa se o nome mudou
    IF TG_OP = 'UPDATE' THEN
        IF OLD.name = NEW.name AND OLD.category_id IS NOT NULL THEN
            RETURN NEW;
        END IF;
    END IF;
    
    -- ========================================
    -- EXECUTAR CLASSIFICAÇÃO
    -- ========================================
    BEGIN
        -- Chamar função master de classificação
        SELECT fn_master_classify_product(NEW.name, NEW.id) INTO v_result;
        
        -- Extrair category_id do resultado
        IF v_result IS NOT NULL AND v_result->>'category_id' IS NOT NULL THEN
            v_category_id := (v_result->>'category_id')::UUID;
            
            -- Atualizar categoria no NEW
            NEW.category_id := v_category_id;
            
            -- Log opcional (comentar em produção se necessário)
            RAISE NOTICE 'Auto-classificado: % -> % (%)', 
                NEW.name, 
                v_result->>'category_slug',
                v_result->>'detected_type';
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        -- Em caso de erro, apenas loga e continua
        RAISE WARNING 'Erro ao classificar produto %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$function$
