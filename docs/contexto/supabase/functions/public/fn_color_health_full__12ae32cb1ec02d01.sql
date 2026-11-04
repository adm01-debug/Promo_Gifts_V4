CREATE OR REPLACE FUNCTION public.fn_color_health_full()
 RETURNS TABLE(check_id text, categoria text, status text, total bigint, detalhes text)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_spot_ok   boolean;
    v_spot_cnt  bigint;
    v_spot_det  text;
BEGIN
    -- C01: Cobertura color_id
    RETURN QUERY
    SELECT 'C01'::text, 'Cobertura color_id Gold'::text,
        CASE WHEN COUNT(*) FILTER (WHERE pv.color_id IS NULL) = 0 THEN '✅ OK' ELSE '❌ ERRO' END::text,
        COUNT(*) FILTER (WHERE pv.color_id IS NOT NULL)::bigint,
        FORMAT('Total ativas: %s | Sem color_id: %s', COUNT(*), COUNT(*) FILTER (WHERE pv.color_id IS NULL))::text
    FROM product_variants pv WHERE pv.is_active = true;

    -- C02: Cobertura color_code
    RETURN QUERY
    SELECT 'C02'::text, 'Cobertura color_code Gold'::text,
        CASE WHEN COUNT(*) FILTER (WHERE pv.color_code IS NULL OR pv.color_code = '') = 0 THEN '✅ OK' ELSE '⚠️ PARCIAL' END::text,
        COUNT(*) FILTER (WHERE pv.color_code IS NOT NULL AND pv.color_code != '')::bigint,
        FORMAT('Total: %s | Sem code: %s | Cobertura: %s%%',
            COUNT(*), COUNT(*) FILTER (WHERE pv.color_code IS NULL OR pv.color_code = ''),
            ROUND(100.0 * COUNT(*) FILTER (WHERE pv.color_code IS NOT NULL AND pv.color_code != '') / NULLIF(COUNT(*),0),1))::text
    FROM product_variants pv WHERE pv.is_active = true;

    -- C03: has_colors consistência
    RETURN QUERY
    SELECT 'C03'::text, 'Consistência has_colors × colors[]'::text,
        CASE WHEN COUNT(*) FILTER (WHERE has_colors = false AND jsonb_array_length(colors) > 1) = 0 THEN '✅ OK' ELSE '⚠️ GAP' END::text,
        COUNT(*) FILTER (WHERE has_colors = false AND jsonb_array_length(colors) > 1)::bigint,
        FORMAT('Multi-cor com has_colors=false: %s', COUNT(*) FILTER (WHERE has_colors = false AND jsonb_array_length(colors) > 1))::text
    FROM products WHERE is_active = true;

    -- C04: Supplier colors sem equivalência
    RETURN QUERY
    SELECT 'C04'::text, 'Supplier colors sem equivalência ativa'::text,
        CASE WHEN COUNT(*) = 0 THEN '✅ OK' ELSE '⚠️ PENDENTE' END::text,
        COUNT(*)::bigint,
        FORMAT('Cores sem mapeamento: %s', COUNT(*))::text
    FROM supplier_colors sc
    LEFT JOIN color_equivalences ce ON ce.supplier_color_id = sc.id AND ce.is_active = true
    WHERE ce.id IS NULL AND sc.is_active = true;

    -- C05: Silver XBZ bicolor
    RETURN QUERY
    SELECT 'C05'::text, 'Silver XBZ bicolor color_id_2'::text,
        CASE WHEN COUNT(*) FILTER (WHERE color_code_2 IS NOT NULL AND color_id_2 IS NULL) = 0 THEN '✅ OK' ELSE '⚠️ GAP' END::text,
        COUNT(*) FILTER (WHERE color_code_2 IS NOT NULL AND color_id_2 IS NOT NULL)::bigint,
        FORMAT('Bicolor: %s | id_2 OK: %s | id_2 NULL: %s',
            COUNT(*) FILTER (WHERE color_code_2 IS NOT NULL),
            COUNT(*) FILTER (WHERE color_code_2 IS NOT NULL AND color_id_2 IS NOT NULL),
            COUNT(*) FILTER (WHERE color_code_2 IS NOT NULL AND color_id_2 IS NULL))::text
    FROM produtos_padronizacao_variantes
    WHERE supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900';

    -- C06: Qualidade equivalências
    RETURN QUERY
    SELECT 'C06'::text, 'Qualidade das equivalências'::text,
        CASE WHEN ROUND(100.0 * COUNT(*) FILTER (WHERE match_quality='exact') / NULLIF(COUNT(*),0),0) >= 70 THEN '✅ OK' ELSE '⚠️ BAIXA' END::text,
        COUNT(*) FILTER (WHERE match_quality = 'exact')::bigint,
        FORMAT('Exact: %s | Close: %s | Approx: %s | %%Exact: %s%%',
            COUNT(*) FILTER (WHERE match_quality='exact'),
            COUNT(*) FILTER (WHERE match_quality='close'),
            COUNT(*) FILTER (WHERE match_quality='approximate'),
            ROUND(100.0 * COUNT(*) FILTER (WHERE match_quality='exact') / NULLIF(COUNT(*),0),1))::text
    FROM color_equivalences WHERE is_active = true;

    -- C07: SPOT integrity (usando variável para evitar ambiguidade)
    SELECT
        bool_and(r.status = '✅ OK'),
        COUNT(*) FILTER (WHERE r.status = '✅ OK'),
        STRING_AGG(r.check_name || ':' || r.status, ' | ')
    INTO v_spot_ok, v_spot_cnt, v_spot_det
    FROM fn_spot_color_integrity_check() r;

    RETURN QUERY
    SELECT 'C07'::text, 'Integridade SPOT color_integrity'::text,
        CASE WHEN v_spot_ok THEN '✅ OK' ELSE '❌ FALHAS' END::text,
        v_spot_cnt, v_spot_det;

    -- C08: fn_relatorio_cores_pendentes operacional
    RETURN QUERY
    SELECT 'C08'::text, 'fn_relatorio_cores_pendentes operacional'::text, '✅ OK'::text,
        (SELECT COUNT(*) FROM fn_relatorio_cores_pendentes())::bigint,
        FORMAT('Pendências: %s', (SELECT COUNT(*) FROM fn_relatorio_cores_pendentes()))::text;
END;
$function$
