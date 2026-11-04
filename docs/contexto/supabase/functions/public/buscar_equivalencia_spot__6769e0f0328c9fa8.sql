CREATE OR REPLACE FUNCTION public.buscar_equivalencia_spot(p_spot_sigla text DEFAULT NULL::text, p_spot_nome text DEFAULT NULL::text)
 RETURNS TABLE(spot_tecnica_nome text, spot_sigla text, tecnica_gravacao_nome text, tecnica_variante_nome text, tecnica_variante_codigo text, tecnica_variante_id uuid, confianca text)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        ste.spot_tecnica_nome::TEXT,
        ste.spot_sigla::TEXT,
        tg.nome::TEXT AS tecnica_gravacao_nome,
        tgv.nome::TEXT AS tecnica_variante_nome,
        tgv.codigo::TEXT AS tecnica_variante_codigo,
        tgv.id AS tecnica_variante_id,
        ste.confianca::TEXT
    FROM spot_tecnica_equivalencia ste
    JOIN tecnica_gravacao_variante tgv ON tgv.id = ste.tecnica_variante_id
    JOIN tecnica_gravacao tg ON tg.id = ste.tecnica_gravacao_id
    WHERE (p_spot_sigla IS NULL OR ste.spot_sigla = p_spot_sigla)
      AND (p_spot_nome IS NULL OR ste.spot_tecnica_nome ILIKE '%' || p_spot_nome || '%')
    ORDER BY ste.confianca DESC, ste.spot_tecnica_nome;
END;
$function$
