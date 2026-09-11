
-- Atualizar fn_enrich_properties_batch para suportar XBZ:
-- XBZ não tem campo 'Properties'; usa concatenação Nome + Descricao
-- Também adiciona suporte a 'xbz' no lookup de supplier_id

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
    v_props_field2      text;   -- campo secundário (concatenado)
    v_mapping_code      text;
    v_supplier_db_code  text;
    v_use_concat        boolean := FALSE;
BEGIN
    -- Normalizar alias: spot/stricker → STRICKER
    v_supplier_db_code := CASE LOWER(p_supplier_code)
        WHEN 'spot'     THEN 'STRICKER'
        WHEN 'stricker' THEN 'STRICKER'
        WHEN 'xbz'      THEN 'XBZ'
        WHEN 'asia'     THEN 'ASIA'
        WHEN 'somarcas' THEN 'SOMARCAS'
        ELSE UPPER(p_supplier_code)
    END;

    v_mapping_code := CASE LOWER(p_supplier_code)
        WHEN 'spot'     THEN 'spot'
        WHEN 'stricker' THEN 'spot'
        ELSE LOWER(p_supplier_code)
    END;

    -- Estratégia por fornecedor:
    -- STRICKER: campo 'Properties' (texto normalizado do WS)
    -- XBZ: concatenar 'Nome' + ' ' + 'Descricao' (não tem Properties)
    CASE v_supplier_db_code
        WHEN 'STRICKER' THEN
            v_props_field  := 'Properties';
            v_props_field2 := NULL;
            v_use_concat   := FALSE;
        WHEN 'XBZ' THEN
            v_props_field  := 'Nome';
            v_props_field2 := 'Descricao';
            v_use_concat   := TRUE;
        ELSE
            v_props_field  := 'properties';
            v_props_field2 := NULL;
            v_use_concat   := FALSE;
    END CASE;

    SELECT id INTO v_supplier_id FROM suppliers WHERE code = v_supplier_db_code LIMIT 1;

    IF v_supplier_id IS NULL THEN
        RETURN jsonb_build_object('status', 'error',
            'message', 'Supplier não encontrado: ' || p_supplier_code);
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
        AND (
            CASE WHEN v_use_concat THEN
                (spr.raw_data ? v_props_field AND spr.raw_data->>v_props_field IS NOT NULL)
            ELSE
                (spr.raw_data ? v_props_field
                 AND spr.raw_data->>v_props_field IS NOT NULL
                 AND spr.raw_data->>v_props_field <> '')
            END
        )
        AND (
            p_force = TRUE
            OR NOT EXISTS (
                SELECT 1 FROM product_properties pp WHERE pp.product_id = p.id
                AND pp.property_code NOT LIKE 'OTHER_%'
                AND pp.property_code NOT IN ('material_xbz_primary','site_url','site_imagens_urls',
                    'gravacao_comprimento_cm','gravacao_medida','gravacao_largura_cm',
                    'site_cores_swatches','site_categoria_path','site_ficha_tecnica_pdf',
                    'circumference_cm','gravacao_local','site_video_youtube_id',
                    'site_video_watch_url','site_modo_de_uso')
            )
        )
        ORDER BY p.id
        LIMIT p_batch_size
    LOOP
        v_processed := v_processed + 1;

        BEGIN
            -- Montar texto fonte para matching
            IF v_use_concat THEN
                v_raw_props := COALESCE(v_rec.bronze_raw->>v_props_field, '')
                               || ' ' ||
                               COALESCE(v_rec.bronze_raw->>v_props_field2, '');
                v_raw_props := LOWER(TRIM(v_raw_props));
            ELSE
                v_raw_props := v_rec.bronze_raw->>v_props_field;
            END IF;

            IF LENGTH(TRIM(v_raw_props)) < 3 THEN
                v_skipped := v_skipped + 1;
                CONTINUE;
            END IF;

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
'v3 (jun/2026): suporte XBZ via Nome+Descricao concat. 
STRICKER usa Properties. XBZ usa Nome+Descricao. Filtra propriedades custom XBZ no check de existência.';

GRANT EXECUTE ON FUNCTION public.fn_enrich_properties_batch(text, integer, boolean) TO service_role;
;
