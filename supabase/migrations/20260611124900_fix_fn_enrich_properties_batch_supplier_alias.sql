
-- Patch: resolver alias spot ↔ STRICKER + normalizar código para o banco de mapeamentos
CREATE OR REPLACE FUNCTION public.fn_enrich_properties_batch(
    p_supplier_code text    DEFAULT 'spot',
    p_batch_size    integer DEFAULT 200,
    p_force         boolean DEFAULT FALSE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_processed         integer := 0;
    v_enriched          integer := 0;
    v_skipped           integer := 0;
    v_errors            integer := 0;
    v_rec               RECORD;
    v_raw_props         text;
    v_result            jsonb;
    v_supplier_id       uuid;
    v_props_field       text;
    v_mapping_code      text;   -- código usado em supplier_property_mappings
    v_supplier_db_code  text;   -- código no tabela suppliers
BEGIN
    -- Normalizar: 'spot' e 'stricker' são o mesmo fornecedor (STRICKER no banco)
    v_supplier_db_code := CASE LOWER(p_supplier_code)
        WHEN 'spot'     THEN 'STRICKER'
        WHEN 'stricker' THEN 'STRICKER'
        ELSE UPPER(p_supplier_code)
    END;

    -- Código para supplier_property_mappings (usa 'spot' como legacy)
    v_mapping_code := CASE LOWER(p_supplier_code)
        WHEN 'spot'     THEN 'spot'
        WHEN 'stricker' THEN 'spot'
        ELSE LOWER(p_supplier_code)
    END;

    -- Campo de properties no raw_data por fornecedor
    v_props_field := CASE v_supplier_db_code
        WHEN 'STRICKER'  THEN 'Properties'
        WHEN 'XBZ'       THEN 'caracteristicas'
        WHEN 'ASIA'      THEN 'properties'
        WHEN 'SOMARCAS'  THEN 'properties'
        ELSE 'Properties'
    END;

    SELECT id INTO v_supplier_id FROM suppliers WHERE code = v_supplier_db_code LIMIT 1;

    IF v_supplier_id IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'error',
            'message', 'Supplier não encontrado: ' || p_supplier_code || ' (buscado como: ' || v_supplier_db_code || ')'
        );
    END IF;

    FOR v_rec IN
        SELECT DISTINCT ON (p.id)
            p.id        AS product_id,
            p.name      AS product_name,
            spr.raw_data AS bronze_raw
        FROM products p
        JOIN supplier_products_raw spr ON spr.product_id = p.id
        WHERE p.supplier_id = v_supplier_id
        AND p.is_active = true
        AND spr.raw_data ? v_props_field
        AND spr.raw_data->>v_props_field IS NOT NULL
        AND spr.raw_data->>v_props_field <> ''
        AND (
            p_force = TRUE
            OR NOT EXISTS (
                SELECT 1 FROM product_properties pp WHERE pp.product_id = p.id
            )
        )
        ORDER BY p.id
        LIMIT p_batch_size
    LOOP
        v_processed := v_processed + 1;

        BEGIN
            v_raw_props := v_rec.bronze_raw->>v_props_field;

            v_result := fn_import_product_properties(
                p_product_id     := v_rec.product_id,
                p_raw_properties := v_raw_props,
                p_source         := 'bronze_batch_' || v_mapping_code,
                p_supplier_code  := v_mapping_code
            );

            IF (v_result->>'success')::boolean = TRUE THEN
                v_enriched := v_enriched + 1;
            ELSE
                v_skipped := v_skipped + 1;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'status',        'ok',
        'supplier_code', v_mapping_code,
        'supplier_id',   v_supplier_id,
        'processed',     v_processed,
        'enriched',      v_enriched,
        'skipped',       v_skipped,
        'errors',        v_errors,
        'timestamp',     now()
    );
END;
$$;

COMMENT ON FUNCTION public.fn_enrich_properties_batch(text, integer, boolean) IS
'v2 alias-fix (jun/2026): spot/stricker → STRICKER. 
Importa properties Gold ← Bronze raw_data → product_properties via fn_import_product_properties.';

GRANT EXECUTE ON FUNCTION public.fn_enrich_properties_batch(text, integer, boolean) TO service_role;
;
