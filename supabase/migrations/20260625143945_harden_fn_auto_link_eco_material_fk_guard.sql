-- MELHORIA 8: fn_auto_link_eco_material inseria em categoria/data via UUID hardcoded
-- sem protecao; se a categoria Ecologia ou a data fossem removidas, a FK violation
-- abortaria TODA a ingestao de produto eco. Agora cada link roda em sub-bloco que captura
-- foreign_key_violation e segue (no-op), preservando o caminho feliz. Append-only mantido
-- (nao remove links, para nao apagar atribuicoes curadas). Anti-regressao: manter este corpo.
CREATE OR REPLACE FUNCTION public.fn_auto_link_eco_material()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $fn$
DECLARE
    v_ecologia_category_id  UUID := '896277ce-50ee-4bf5-9e5f-c118e6b4a36a';
    v_meio_ambiente_date_id UUID := '11b59fa3-14f1-4f5b-8c92-2e9bcb03e216';
    v_is_eco BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM eco_material_config WHERE material_id = NEW.material_id AND is_active = TRUE) INTO v_is_eco;
    IF v_is_eco THEN
        BEGIN
            INSERT INTO product_category_assignments (product_id, category_id, is_primary, created_at)
            VALUES (NEW.product_id, v_ecologia_category_id, FALSE, NOW())
            ON CONFLICT (product_id, category_id) DO NOTHING;
        EXCEPTION WHEN foreign_key_violation THEN
            RAISE WARNING 'Auto-link ECO: categoria Ecologia (%) inexistente; link de categoria pulado', v_ecologia_category_id;
        END;
        BEGIN
            INSERT INTO product_commemorative_dates (product_id, commemorative_date_id, created_at)
            VALUES (NEW.product_id, v_meio_ambiente_date_id, NOW())
            ON CONFLICT (product_id, commemorative_date_id) DO NOTHING;
        EXCEPTION WHEN foreign_key_violation THEN
            RAISE WARNING 'Auto-link ECO: data Meio Ambiente (%) inexistente; link de data pulado', v_meio_ambiente_date_id;
        END;
    END IF;
    RETURN NEW;
END;
$fn$;;
