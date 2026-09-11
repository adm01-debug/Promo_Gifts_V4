
-- Fix: remover colunas inexistentes (source, updated_at)
-- Usar schema real: id, product_id, category_id, is_primary, display_order, created_at

CREATE OR REPLACE FUNCTION public.fn_enrich_pen_categories(
    p_supplier_id       uuid    DEFAULT NULL,
    p_batch_size        integer DEFAULT 300,
    p_force_reclassify  boolean DEFAULT FALSE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_processed     integer := 0;
    v_classified    integer := 0;
    v_skipped       integer := 0;
    v_errors        integer := 0;
    v_rec           RECORD;
    v_pen_result    jsonb;
    v_category_id   uuid;
    v_pen_category_ids uuid[];
BEGIN
    -- Pré-carregar IDs das categorias de canetas
    SELECT ARRAY_AGG(id) INTO v_pen_category_ids
    FROM categories
    WHERE (slug ILIKE 'caneta%' OR slug = 'lapiseiras')
    AND is_active = true;

    FOR v_rec IN
        SELECT p.id, p.name, p.supplier_id
        FROM products p
        WHERE p.is_active = true
        AND (
            p.name ILIKE '%caneta%'
            OR p.name ILIKE '%esferograf%'
            OR p.name ILIKE '%lapiseira%'
            OR p.name ILIKE '%roller%'
            OR p.name ILIKE '%stylus%'
        )
        AND (p_supplier_id IS NULL OR p.supplier_id = p_supplier_id)
        AND (
            p_force_reclassify = TRUE
            OR NOT EXISTS (
                SELECT 1 FROM product_category_assignments pca
                WHERE pca.product_id = p.id
                AND pca.category_id = ANY(v_pen_category_ids)
            )
        )
        ORDER BY p.id
        LIMIT p_batch_size
    LOOP
        v_processed := v_processed + 1;

        BEGIN
            v_pen_result := classify_pen(v_rec.name);

            IF (v_pen_result->>'is_pen')::boolean = TRUE
               AND (v_pen_result->>'category_id') IS NOT NULL THEN

                v_category_id := (v_pen_result->>'category_id')::uuid;

                INSERT INTO product_category_assignments (
                    product_id,
                    category_id,
                    is_primary,
                    display_order,
                    created_at
                )
                VALUES (
                    v_rec.id,
                    v_category_id,
                    FALSE,
                    0,
                    now()
                )
                ON CONFLICT (product_id, category_id) DO NOTHING;

                v_classified := v_classified + 1;
            ELSE
                v_skipped := v_skipped + 1;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'status',      'ok',
        'processed',   v_processed,
        'classified',  v_classified,
        'skipped',     v_skipped,
        'errors',      v_errors,
        'timestamp',   now()
    );
END;
$$;

COMMENT ON FUNCTION public.fn_enrich_pen_categories(uuid, integer, boolean) IS
'v2 fix (jun/2026): schema correto sem updated_at/source. Classifica canetas Gold → product_category_assignments.';

GRANT EXECUTE ON FUNCTION public.fn_enrich_pen_categories(uuid, integer, boolean) TO service_role;
;
