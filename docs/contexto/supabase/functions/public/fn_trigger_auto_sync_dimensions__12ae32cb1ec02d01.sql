CREATE OR REPLACE FUNCTION public.fn_trigger_auto_sync_dimensions()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_old_combined TEXT;
    v_new_combined TEXT;
    v_should_sync BOOLEAN := FALSE;
BEGIN
    -- Extrair CombinedSizes para comparação
    v_new_combined := NEW.raw_data->>'CombinedSizes';
    
    IF TG_OP = 'UPDATE' THEN
        v_old_combined := OLD.raw_data->>'CombinedSizes';
        
        -- Verificar se deve sincronizar:
        -- 1. product_id foi preenchido (novo vínculo)
        -- 2. OU CombinedSizes mudou (reimportação)
        IF (NEW.product_id IS NOT NULL AND OLD.product_id IS NULL) THEN
            v_should_sync := TRUE;
        ELSIF (NEW.product_id IS NOT NULL AND v_new_combined IS DISTINCT FROM v_old_combined) THEN
            v_should_sync := TRUE;
        END IF;
        
    ELSIF TG_OP = 'INSERT' THEN
        -- No INSERT, só sincroniza se product_id já veio preenchido
        IF NEW.product_id IS NOT NULL THEN
            v_should_sync := TRUE;
        END IF;
    END IF;
    
    -- Executar sincronização se necessário
    IF v_should_sync THEN
        PERFORM fn_sync_single_product_dimensions(NEW.product_id, NEW.raw_data);
    END IF;
    
    RETURN NEW;
END;
$function$
