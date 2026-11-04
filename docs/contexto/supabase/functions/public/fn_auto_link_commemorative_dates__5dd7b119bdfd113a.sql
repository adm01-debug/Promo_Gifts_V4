CREATE OR REPLACE FUNCTION public.fn_auto_link_commemorative_dates(p_product_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_category_id UUID;
    v_category_name TEXT;
    v_date_record RECORD;
    v_linked_count INTEGER := 0;
BEGIN
    -- 1. Buscar categoria do produto
    SELECT c.id, LOWER(unaccent(c.name))
    INTO v_category_id, v_category_name
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE p.id = p_product_id;

    IF v_category_id IS NULL THEN
        RETURN 0;
    END IF;

    -- 2. Buscar datas relacionadas à categoria (SEM target_audience='todos' — esse critério era o bug
    --    que linkava todos os 7200 produtos a cada data genérica)
    FOR v_date_record IN (
        SELECT cd.id AS date_id, cd.name AS date_name
        FROM commemorative_dates cd
        WHERE cd.is_active = true
          AND cd.target_audience IS NOT NULL
          AND cd.target_audience <> 'todos'
          AND (
              v_category_name ILIKE '%' || LOWER(cd.target_audience) || '%'
              OR LOWER(cd.target_audience) ILIKE '%' || v_category_name || '%'
          )
    )
    LOOP
        INSERT INTO product_commemorative_dates (
            product_id, commemorative_date_id, relevance_score, source, created_at
        )
        VALUES (
            p_product_id,
            v_date_record.date_id,
            CASE WHEN v_date_record.date_name ILIKE '%' || v_category_name || '%' THEN 10 ELSE 5 END,
            'auto',
            NOW()
        )
        ON CONFLICT (product_id, commemorative_date_id) DO NOTHING;

        IF FOUND THEN v_linked_count := v_linked_count + 1; END IF;
    END LOOP;

    RETURN v_linked_count;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro vinculando datas do produto %: %', p_product_id, SQLERRM;
    RETURN 0;
END;
$function$
