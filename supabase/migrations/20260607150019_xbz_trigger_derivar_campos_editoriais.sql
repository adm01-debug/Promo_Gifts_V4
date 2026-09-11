
-- Trigger: derivação automática de campos editoriais XBZ em produtos_padronizacao
-- Cobre: short_description, supplier_seo_name, supplier_seo_short_description
-- Dispara: BEFORE INSERT OR UPDATE nos campos relevantes
-- Regra: só preenche se NULL (não sobrescreve edição manual)

CREATE OR REPLACE FUNCTION fn_xbz_derivar_campos_editoriais()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.supplier_id != 'd6718a29-e954-4c1b-bd84-03ea24884900' THEN
        RETURN NEW;
    END IF;
    IF NEW.short_description IS NULL AND NEW.description IS NOT NULL AND length(trim(NEW.description)) > 0 THEN
        NEW.short_description := CASE
            WHEN position('.' IN NEW.description) > 0 AND position('.' IN NEW.description) <= 160
                THEN left(NEW.description, position('.' IN NEW.description))
            WHEN length(NEW.description) <= 160 THEN NEW.description
            ELSE left(NEW.description, 157) || '...'
        END;
    END IF;
    IF NEW.supplier_seo_name IS NULL AND NEW.name IS NOT NULL THEN
        NEW.supplier_seo_name := initcap(lower(NEW.name));
    END IF;
    IF NEW.supplier_seo_short_description IS NULL AND NEW.short_description IS NOT NULL THEN
        NEW.supplier_seo_short_description := NEW.short_description;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_xbz_derivar_campos_editoriais ON produtos_padronizacao;
CREATE TRIGGER trg_xbz_derivar_campos_editoriais
    BEFORE INSERT OR UPDATE OF name, description, short_description, supplier_seo_name, supplier_seo_short_description
    ON produtos_padronizacao
    FOR EACH ROW EXECUTE FUNCTION fn_xbz_derivar_campos_editoriais();
;
