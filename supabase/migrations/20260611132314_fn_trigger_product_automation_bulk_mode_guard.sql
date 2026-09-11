
-- ============================================================
-- CORREÇÃO: fn_trigger_product_automation
-- Adiciona guarda de bulk_import_mode + write_source='pipeline'
-- Evita timeout em updates em lote (is_thermal, backfill, etc.)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_trigger_product_automation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_classify_result JSONB;
    v_materials_linked INTEGER;
    v_bulk_mode BOOLEAN;
    v_write_source TEXT;
BEGIN
    -- ── GUARDA DE MODO BULK ──────────────────────────────────
    -- Quando pipeline ou bulk import está ativo, pula automações
    -- pesadas (tags, datas, ECO, feminino) — serão rodadas em lote
    v_bulk_mode    := current_setting('app.bulk_import_mode', true) = 'true';
    v_write_source := current_setting('app.write_source',     true);

    IF v_bulk_mode OR v_write_source = 'pipeline' THEN
        RETURN NEW;
    END IF;
    -- ────────────────────────────────────────────────────────

    -- 1. CLASSIFICAR CATEGORIA (se ainda não tem)
    IF NEW.category_id IS NULL THEN
        v_classify_result := fn_master_classify_product(NEW.name, NEW.id);
        RAISE NOTICE 'Produto [%] classificado: tipo=%, categoria=%',
            LEFT(NEW.name, 30),
            v_classify_result->>'detected_type',
            v_classify_result->>'category_id';
    END IF;

    -- 2. VINCULAR MATERIAIS
    v_materials_linked := fn_link_product_materials(NEW.id, NEW.supplier_id);
    IF v_materials_linked > 0 THEN
        RAISE NOTICE 'Produto [%]: % materiais vinculados', LEFT(NEW.name, 30), v_materials_linked;
    END IF;

    -- 3. AUTOMAÇÕES SECUNDÁRIAS (com tratamento de erro individual)
    BEGIN PERFORM fn_auto_link_tags(NEW.id);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Aviso: fn_auto_link_tags falhou: %', SQLERRM;
    END;

    BEGIN PERFORM fn_auto_link_properties(NEW.id);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Aviso: fn_auto_link_properties falhou: %', SQLERRM;
    END;

    BEGIN PERFORM fn_auto_link_eco(NEW.id);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Aviso: fn_auto_link_eco falhou: %', SQLERRM;
    END;

    BEGIN PERFORM fn_auto_link_feminino(NEW.id);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Aviso: fn_auto_link_feminino falhou: %', SQLERRM;
    END;

    BEGIN PERFORM fn_auto_link_commemorative_dates(NEW.id);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Aviso: fn_auto_link_commemorative_dates falhou: %', SQLERRM;
    END;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro no trigger de automação para produto %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_trigger_product_automation() IS
'Trigger de automação de produtos. Guarda bulk_import_mode e write_source=pipeline para operações em lote. v2.0 2026-06-11';
;
