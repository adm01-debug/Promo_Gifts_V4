CREATE OR REPLACE FUNCTION set_is_imported_from_origin()
RETURNS TRIGGER AS $$
DECLARE
    v_stricker_id UUID := 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0';
    v_country TEXT;
BEGIN
    -- STRICKER ou sem fornecedor: usa país de origem
    IF NEW.supplier_id = v_stricker_id OR NEW.supplier_id IS NULL THEN
        
        v_country := NULLIF(TRIM(NEW.origin_country), '');
        
        IF v_country IS NULL THEN
            -- Sem país definido
            IF TG_OP = 'INSERT' THEN
                NEW.is_imported := TRUE;
            ELSE
                NEW.is_imported := COALESCE(OLD.is_imported, TRUE);
            END IF;
        ELSIF UPPER(v_country) IN ('BRASIL', 'BR', 'BRAZIL') THEN
            -- Nacional
            NEW.is_imported := FALSE;
        ELSE
            -- Importado
            NEW.is_imported := TRUE;
        END IF;
    ELSE
        -- XBZ, ASIA, outros fornecedores: SEMPRE importado
        NEW.is_imported := TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
