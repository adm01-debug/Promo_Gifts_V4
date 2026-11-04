CREATE OR REPLACE FUNCTION public.fn_relatorio_cores_pendentes()
 RETURNS TABLE(tipo text, codigo text, nome text, quantidade bigint)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Cores de fornecedor sem equivalência ativa
    RETURN QUERY
    SELECT 
        'Cor fornecedor sem equivalência'::TEXT,
        sc.code::TEXT,
        sc.name::TEXT,
        1::BIGINT
    FROM supplier_colors sc
    LEFT JOIN color_equivalences ce ON ce.supplier_color_id = sc.id AND ce.is_active = true
    WHERE ce.id IS NULL
      AND sc.is_active = true;

    -- Variantes Gold com color_id NULL e código de cor em attributes
    RETURN QUERY
    SELECT 
        'Código em variante sem mapeamento'::TEXT,
        (pv.attributes->>'codigo_cor')::TEXT,
        (pv.attributes->>'cor')::TEXT,
        COUNT(*)::BIGINT
    FROM product_variants pv
    WHERE pv.color_id IS NULL
      AND pv.is_active = true
      AND pv.attributes->>'codigo_cor' IS NOT NULL
    GROUP BY pv.attributes->>'codigo_cor', pv.attributes->>'cor';

    -- Variantes Gold com color_id NULL e nome de cor em attributes (sem código)
    RETURN QUERY
    SELECT 
        'Nome de cor sem mapeamento'::TEXT,
        NULL::TEXT,
        (pv.attributes->>'cor')::TEXT,
        COUNT(*)::BIGINT
    FROM product_variants pv
    WHERE pv.color_id IS NULL
      AND pv.is_active = true
      AND pv.attributes->>'codigo_cor' IS NULL
      AND pv.attributes->>'cor' IS NOT NULL
    GROUP BY pv.attributes->>'cor';
END;
$function$
