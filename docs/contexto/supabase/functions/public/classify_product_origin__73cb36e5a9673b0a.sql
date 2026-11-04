CREATE OR REPLACE FUNCTION public.classify_product_origin(p_update_records boolean DEFAULT false, p_product_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
    v_total INTEGER := 0;
    v_nacionais INTEGER := 0;
    v_importados INTEGER := 0;
    v_sem_origem INTEGER := 0;
    v_atualizados INTEGER := 0;
    v_paises JSONB;
    v_por_fornecedor JSONB;
    
    v_stricker_id UUID := 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0';
BEGIN
    SELECT jsonb_object_agg(
        COALESCE(origin_country, 'NÃO DEFINIDO'),
        cnt
    )
    INTO v_paises
    FROM (
        SELECT origin_country, COUNT(*) as cnt
        FROM products
        WHERE (p_product_id IS NULL OR id = p_product_id)
          AND is_deleted = FALSE
          AND (supplier_id = v_stricker_id OR supplier_id IS NULL)
        GROUP BY origin_country
        ORDER BY cnt DESC
    ) sub;

    SELECT jsonb_object_agg(
        COALESCE(s.code, 'SEM_FORNECEDOR'),
        jsonb_build_object(
            'total', sub.cnt,
            'regra', CASE 
                WHEN sub.supplier_id = v_stricker_id OR sub.supplier_id IS NULL THEN 'origin_country'
                ELSE 'sempre_importado'
            END
        )
    )
    INTO v_por_fornecedor
    FROM (
        SELECT supplier_id, COUNT(*) as cnt
        FROM products
        WHERE (p_product_id IS NULL OR id = p_product_id)
          AND is_deleted = FALSE
        GROUP BY supplier_id
    ) sub
    LEFT JOIN suppliers s ON s.id = sub.supplier_id;

    SELECT COUNT(*)
    INTO v_nacionais
    FROM products
    WHERE (p_product_id IS NULL OR id = p_product_id)
      AND is_deleted = FALSE
      AND (supplier_id = v_stricker_id OR supplier_id IS NULL)
      AND UPPER(TRIM(origin_country)) IN ('BRASIL', 'BR', 'BRAZIL');

    SELECT COUNT(*)
    INTO v_importados
    FROM products
    WHERE (p_product_id IS NULL OR id = p_product_id)
      AND is_deleted = FALSE
      AND (
          ((supplier_id = v_stricker_id OR supplier_id IS NULL)
           AND origin_country IS NOT NULL 
           AND TRIM(origin_country) != ''
           AND UPPER(TRIM(origin_country)) NOT IN ('BRASIL', 'BR', 'BRAZIL'))
          OR
          (supplier_id IS NOT NULL AND supplier_id != v_stricker_id)
      );

    SELECT COUNT(*)
    INTO v_sem_origem
    FROM products
    WHERE (p_product_id IS NULL OR id = p_product_id)
      AND is_deleted = FALSE
      AND (supplier_id = v_stricker_id OR supplier_id IS NULL)
      AND (origin_country IS NULL OR TRIM(origin_country) = '');

    SELECT COUNT(*)
    INTO v_total
    FROM products
    WHERE (p_product_id IS NULL OR id = p_product_id)
      AND is_deleted = FALSE;

    IF p_update_records THEN
        UPDATE products
        SET 
            is_imported = CASE 
                WHEN supplier_id = v_stricker_id OR supplier_id IS NULL THEN
                    CASE 
                        WHEN origin_country IS NULL OR TRIM(origin_country) = '' THEN NULL
                        WHEN UPPER(TRIM(origin_country)) IN ('BRASIL', 'BR', 'BRAZIL') THEN FALSE
                        ELSE TRUE
                    END
                ELSE TRUE
            END,
            updated_at = NOW()
        WHERE (p_product_id IS NULL OR id = p_product_id)
          AND is_deleted = FALSE
          AND (
              is_imported IS DISTINCT FROM (
                  CASE 
                      WHEN supplier_id = v_stricker_id OR supplier_id IS NULL THEN
                          CASE 
                              WHEN origin_country IS NULL OR TRIM(origin_country) = '' THEN NULL
                              WHEN UPPER(TRIM(origin_country)) IN ('BRASIL', 'BR', 'BRAZIL') THEN FALSE
                              ELSE TRUE
                          END
                      ELSE TRUE
                  END
              )
          );
        
        GET DIAGNOSTICS v_atualizados = ROW_COUNT;
    END IF;

    v_result := jsonb_build_object(
        'success', TRUE,
        'statistics', jsonb_build_object(
            'total_products', v_total,
            'nacionais', v_nacionais,
            'nacionais_pct', ROUND((v_nacionais::NUMERIC / NULLIF(v_total, 0) * 100), 1),
            'importados', v_importados,
            'importados_pct', ROUND((v_importados::NUMERIC / NULLIF(v_total, 0) * 100), 1),
            'sem_origem_definida', v_sem_origem
        ),
        'by_country', COALESCE(v_paises, '{}'::jsonb),
        'by_supplier', COALESCE(v_por_fornecedor, '{}'::jsonb),
        'rules', jsonb_build_object(
            'STRICKER', 'origin_country: Brasil/BR/Brazil = Nacional',
            'SEM_FORNECEDOR', 'origin_country: Brasil/BR/Brazil = Nacional',
            'XBZ', 'Sempre Importado',
            'ASIA', 'Sempre Importado',
            'OUTROS', 'Sempre Importado'
        ),
        'update_mode', p_update_records,
        'records_updated', v_atualizados,
        'generated_at', NOW()
    );

    RETURN v_result;
END;
$function$
