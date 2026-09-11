
-- ============================================================================
-- fn_enrich_properties_batch()
-- 
-- Propósito: Importar properties de produtos Gold que têm dados no Bronze
--            mas ainda não tiveram properties importadas para product_properties.
--
-- Fluxo: Gold (products) ← join → Bronze (supplier_products_raw)
--        → para SPOT: lê raw_data->>'Properties' → fn_import_product_properties
--
-- Seguro: idempotente, não apaga properties existentes, captura erros por produto.
-- Cadência recomendada: pg_cron diário após pipeline promote (ex: 06:00)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_enrich_properties_batch(
    p_supplier_code text    DEFAULT 'spot',   -- 'spot' é o único com mapeamentos agora
    p_batch_size    integer DEFAULT 200,
    p_force         boolean DEFAULT FALSE      -- TRUE: reprocessa mesmo com properties existentes
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_processed     integer := 0;
    v_enriched      integer := 0;
    v_skipped       integer := 0;
    v_errors        integer := 0;
    v_rec           RECORD;
    v_raw_props     text;
    v_result        jsonb;
    v_supplier_id   uuid;
    v_props_field   text;
BEGIN
    -- Resolver supplier_id e campo de properties no raw_data
    SELECT id INTO v_supplier_id FROM suppliers WHERE LOWER(code) = LOWER(p_supplier_code) LIMIT 1;
    
    -- Mapeamento de campo properties por fornecedor
    v_props_field := CASE LOWER(p_supplier_code)
        WHEN 'spot'     THEN 'Properties'
        WHEN 'stricker' THEN 'Properties'
        WHEN 'xbz'      THEN 'caracteristicas'
        WHEN 'asia'     THEN 'properties'
        WHEN 'somarcas' THEN 'properties'
        ELSE 'Properties'
    END;

    IF v_supplier_id IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Supplier não encontrado: ' || p_supplier_code);
    END IF;

    -- Processar produtos Gold sem properties importadas
    FOR v_rec IN
        SELECT DISTINCT ON (p.id)
            p.id                AS product_id,
            p.name              AS product_name,
            spr.raw_data        AS bronze_raw
        FROM products p
        JOIN supplier_products_raw spr ON spr.product_id = p.id
        WHERE p.supplier_id = v_supplier_id
        AND p.is_active = true
        AND spr.raw_data ? v_props_field                                  -- tem o campo no Bronze
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

            -- Chamar a função de importação existente
            v_result := fn_import_product_properties(
                p_product_id    := v_rec.product_id,
                p_raw_properties := v_raw_props,
                p_source        := 'bronze_batch_' || LOWER(p_supplier_code),
                p_supplier_code := LOWER(p_supplier_code)
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
        'status',          'ok',
        'supplier_code',   p_supplier_code,
        'batch_size',      p_batch_size,
        'processed',       v_processed,
        'enriched',        v_enriched,
        'skipped',         v_skipped,
        'errors',          v_errors,
        'timestamp',       now()
    );
END;
$$;

COMMENT ON FUNCTION public.fn_enrich_properties_batch(text, integer, boolean) IS
'Importa properties de produtos Gold via Bronze raw_data → product_properties.
Usa fn_import_product_properties. Idempotente. 
Parâmetros: supplier_code (default spot), batch_size (default 200), force (default FALSE).';

GRANT EXECUTE ON FUNCTION public.fn_enrich_properties_batch(text, integer, boolean) TO service_role;
;
