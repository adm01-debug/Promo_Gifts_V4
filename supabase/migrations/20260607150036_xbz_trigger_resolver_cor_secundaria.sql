
-- Trigger: resolução automática da cor secundária XBZ em produtos_padronizacao_variantes
-- Cobre: color_hex_2 (via supplier_colors) e color_id_2 (via color_variations)
-- Dispara: BEFORE INSERT OR UPDATE nos campos de cor secundária
-- Regra: limpa monocromáticos, só preenche se NULL

CREATE OR REPLACE FUNCTION fn_xbz_resolver_cor_secundaria()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_hex     text;
    v_cv_id   uuid;
    v_cv_name text;
BEGIN
    IF NEW.supplier_id != 'd6718a29-e954-4c1b-bd84-03ea24884900' THEN RETURN NEW; END IF;
    IF NEW.color_name_2 = '' THEN NEW.color_name_2 := NULL; END IF;
    IF NEW.color_name_2 IS NOT NULL AND upper(trim(NEW.color_name_2)) = upper(trim(COALESCE(NEW.color_name,''))) THEN
        NEW.color_name_2 := NULL; NEW.color_code_2 := NULL; NEW.color_hex_2 := NULL; NEW.color_id_2 := NULL;
        RETURN NEW;
    END IF;
    IF NEW.color_name_2 IS NULL THEN RETURN NEW; END IF;
    IF NEW.color_hex_2 IS NULL AND NEW.color_code_2 IS NOT NULL THEN
        SELECT hex_code INTO v_hex FROM supplier_colors
        WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND api_color_id = NEW.color_code_2 LIMIT 1;
        NEW.color_hex_2 := v_hex;
    END IF;
    IF NEW.color_id_2 IS NULL THEN
        v_cv_name := CASE trim(upper(NEW.color_name_2))
            WHEN 'PRETO' THEN 'Preto' WHEN 'BRANCO' THEN 'Branco' WHEN 'AZUL' THEN 'Azul'
            WHEN 'VERMELHO' THEN 'Vermelho' WHEN 'VERDE' THEN 'Verde' WHEN 'AMARELO' THEN 'Amarelo'
            WHEN 'ROSA' THEN 'Rosa' WHEN 'LARANJA' THEN 'Laranja' WHEN 'ROXO' THEN 'Roxo'
            WHEN 'CINZA' THEN 'Cinza' WHEN 'MARROM' THEN 'Marrom' WHEN 'TRANSPARENTE' THEN 'Transparente'
            WHEN 'MADEIRA' THEN 'Madeira' WHEN 'BAMBU' THEN 'Bambu' WHEN 'BRONZE' THEN 'Bronze'
            WHEN 'COBRE' THEN 'Cobre' WHEN 'COLORIDO' THEN 'Colorido' WHEN 'KRAFT' THEN 'Kraft'
            WHEN 'BEGE' THEN 'Bege Nude' WHEN 'PRATA' THEN 'Prata' WHEN 'INOX' THEN 'Prata'
            ELSE NULL
        END;
        IF v_cv_name IS NOT NULL THEN
            SELECT id INTO v_cv_id FROM color_variations WHERE name = v_cv_name LIMIT 1;
            NEW.color_id_2 := v_cv_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_xbz_resolver_cor_secundaria ON produtos_padronizacao_variantes;
CREATE TRIGGER trg_xbz_resolver_cor_secundaria
    BEFORE INSERT OR UPDATE OF color_name_2, color_code_2, color_hex_2, color_id_2
    ON produtos_padronizacao_variantes
    FOR EACH ROW EXECUTE FUNCTION fn_xbz_resolver_cor_secundaria();
;
