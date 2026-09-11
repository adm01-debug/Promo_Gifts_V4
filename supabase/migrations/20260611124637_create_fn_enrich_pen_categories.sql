
-- ============================================================================
-- fn_enrich_pen_categories(p_supplier_id, p_batch_size, p_force_reclassify)
-- 
-- Propósito: Classificar canetas no Gold usando classify_pen v2.1
--            → grava em product_category_assignments
--            → grava atributos no products.properties_data (se existir)
--
-- Modo de uso:
--   SELECT fn_enrich_pen_categories();                  -- todos os fornecedores, só não-classificadas
--   SELECT fn_enrich_pen_categories(NULL, 500, TRUE);   -- reclassifica tudo (força)
--   SELECT fn_enrich_pen_categories('uuid-spot', 200);  -- só SPOT, 200 por vez
--
-- Regras de segurança:
--   - Nunca remove categorias existentes NÃO-canetas do produto
--   - ON CONFLICT DO NOTHING → idempotente
--   - Não modifica produtos que não são canetas (classify_pen.is_pen = false)
--   - p_force_reclassify = FALSE (default): só processa sem categoria de caneta
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_enrich_pen_categories(
    p_supplier_id       uuid    DEFAULT NULL,    -- NULL = todos os fornecedores
    p_batch_size        integer DEFAULT 300,
    p_force_reclassify  boolean DEFAULT FALSE    -- TRUE = reclassifica mesmo quem já tem
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
    -- Pré-carregar UUIDs das categorias de canetas para filtro eficiente
    SELECT ARRAY_AGG(id) INTO v_pen_category_ids
    FROM categories
    WHERE (slug ILIKE 'caneta%' OR slug = 'lapiseiras')
    AND is_active = true;

    -- Loop sobre produtos candidatos
    FOR v_rec IN
        SELECT DISTINCT ON (p.id)
            p.id,
            p.name,
            p.supplier_id
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
            -- Classificar
            v_pen_result := classify_pen(v_rec.name);

            -- Só processa se for caneta e tiver category_id
            IF (v_pen_result->>'is_pen')::boolean = TRUE
               AND (v_pen_result->>'category_id') IS NOT NULL THEN

                v_category_id := (v_pen_result->>'category_id')::uuid;

                -- Gravar em product_category_assignments (idempotente)
                INSERT INTO product_category_assignments (
                    product_id,
                    category_id,
                    is_primary,
                    source,
                    created_at,
                    updated_at
                )
                VALUES (
                    v_rec.id,
                    v_category_id,
                    FALSE,          -- não sobrescreve primary existente
                    'classify_pen_v2',
                    now(),
                    now()
                )
                ON CONFLICT (product_id, category_id) DO UPDATE
                    SET updated_at = now(),
                        source = 'classify_pen_v2';

                v_classified := v_classified + 1;

            ELSE
                v_skipped := v_skipped + 1;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
            -- Continua sem parar o batch inteiro
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
'Classifica canetas no Gold usando classify_pen v2.1 → product_category_assignments.
Idempotente (ON CONFLICT DO UPDATE). Seguro: não remove categorias existentes.
Parâmetros: supplier_id (NULL=todos), batch_size (default 300), force_reclassify (default FALSE).';

-- Garantir permissão de execução
GRANT EXECUTE ON FUNCTION public.fn_enrich_pen_categories(uuid, integer, boolean) TO service_role;
;
