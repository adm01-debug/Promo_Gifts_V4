CREATE OR REPLACE FUNCTION public.set_product_defaults_from_supplier()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_settings RECORD;
    v_country TEXT;
    v_packing_result JSONB;
    v_extracted JSONB;
    v_classification TEXT;
BEGIN
    -- Buscar configurações do fornecedor
    SELECT * INTO v_settings
    FROM supplier_settings
    WHERE supplier_id = NEW.supplier_id;
    
    -- ═══════════════════════════════════════════════════════════════
    -- PARTE 1: CONFIGURAÇÕES DO FORNECEDOR (supply_mode, is_imported, lead_time)
    -- ═══════════════════════════════════════════════════════════════
    
    IF FOUND THEN
        -- Aplicar supply_mode padrão
        IF NEW.supply_mode IS NULL OR TG_OP = 'INSERT' THEN
            NEW.supply_mode := v_settings.default_supply_mode;
        END IF;
        
        -- Aplicar lead_time_days padrão
        IF NEW.lead_time_days IS NULL THEN
            NEW.lead_time_days := v_settings.default_lead_time_days;
        END IF;
        
        -- Determinar is_imported
        IF v_settings.use_origin_country THEN
            v_country := NULLIF(TRIM(NEW.origin_country), '');
            
            IF v_country IS NULL THEN
                IF TG_OP = 'INSERT' THEN
                    NEW.is_imported := TRUE;
                ELSE
                    NEW.is_imported := COALESCE(OLD.is_imported, TRUE);
                END IF;
            ELSIF UPPER(v_country) IN ('BRASIL', 'BR', 'BRAZIL') THEN
                NEW.is_imported := FALSE;
            ELSE
                NEW.is_imported := TRUE;
            END IF;
        ELSE
            NEW.is_imported := v_settings.default_is_imported;
        END IF;
    ELSE
        -- Sem configuração: manter comportamento para produtos sem fornecedor
        IF NEW.supplier_id IS NULL THEN
            v_country := NULLIF(TRIM(NEW.origin_country), '');
            
            IF v_country IS NULL THEN
                IF TG_OP = 'INSERT' THEN
                    NEW.is_imported := TRUE;
                ELSE
                    NEW.is_imported := COALESCE(OLD.is_imported, TRUE);
                END IF;
            ELSIF UPPER(v_country) IN ('BRASIL', 'BR', 'BRAZIL') THEN
                NEW.is_imported := FALSE;
            ELSE
                NEW.is_imported := TRUE;
            END IF;
        END IF;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- PARTE 2: CLASSIFICAÇÃO DE EMBALAGEM (packing_classification)
    -- ═══════════════════════════════════════════════════════════════
    
    -- Só classificar se ainda não tem classificação ou é INSERT
    IF NEW.packing_classification IS NULL OR TG_OP = 'INSERT' THEN
        
        -- PRIORIDADE 1: Usar packing_type se existir
        IF NEW.packing_type IS NOT NULL AND TRIM(NEW.packing_type) <> '' THEN
            SELECT fn_classify_packing_type(NEW.packing_type) INTO v_packing_result;
            v_classification := v_packing_result->>'classification';
            
            IF v_classification IS NOT NULL THEN
                NEW.packing_classification := v_classification;
            END IF;
        END IF;
        
        -- PRIORIDADE 2: Extrair da descrição se ainda não classificou
        IF NEW.packing_classification IS NULL AND NEW.description IS NOT NULL THEN
            SELECT fn_extract_packaging_from_description(NEW.description) INTO v_extracted;
            
            IF (v_extracted->>'found')::boolean = true THEN
                IF v_extracted->>'packaging_text' IS NOT NULL THEN
                    SELECT fn_classify_packing_type(v_extracted->>'packaging_text') INTO v_packing_result;
                    v_classification := v_packing_result->>'classification';
                    
                    IF v_classification IS NOT NULL THEN
                        NEW.packing_classification := v_classification;
                    ELSIF (v_extracted->>'is_gift_packaging')::boolean = true THEN
                        NEW.packing_classification := 'commercial';
                    END IF;
                END IF;
            END IF;
        END IF;
        
        -- PRIORIDADE 3: Usar default do fornecedor se ainda não classificou
        IF NEW.packing_classification IS NULL AND FOUND AND v_settings.default_packing_classification IS NOT NULL THEN
            NEW.packing_classification := v_settings.default_packing_classification;
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$function$
