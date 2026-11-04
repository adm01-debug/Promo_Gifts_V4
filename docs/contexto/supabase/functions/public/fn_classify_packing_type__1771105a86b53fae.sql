CREATE OR REPLACE FUNCTION public.fn_classify_packing_type(p_packing_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE v_n TEXT;
BEGIN
    IF p_packing_type IS NULL OR TRIM(p_packing_type) = '' THEN
        RETURN jsonb_build_object('raw',p_packing_type,'classification','none',
            'is_commercial',FALSE,'is_protective',FALSE,'can_be_customized',FALSE,'has_image_expected',FALSE);
    END IF;
    v_n := LOWER(TRIM(p_packing_type));

    -- PRÉ-CHECK A: Polybag
    IF (v_n ~ 'polybag|poly[- ]bag')
       AND NOT (v_n ~ '(caixa|estojo|maleta|kraft|tnt|non-woven|bolsa|saco de|sacola de)') THEN
        RETURN jsonb_build_object('raw',p_packing_type,'classification','protective',
            'is_commercial',FALSE,'is_protective',TRUE,'can_be_customized',FALSE,'has_image_expected',FALSE);
    END IF;

    -- PRÉ-CHECK B: "Sem polybag/packing"
    IF v_n ~ '^sem polybag' OR v_n ~ '^sem packing' THEN
        RETURN jsonb_build_object('raw',p_packing_type,'classification','protective',
            'is_commercial',FALSE,'is_protective',TRUE,'can_be_customized',FALSE,'has_image_expected',FALSE);
    END IF;

    -- PRÉ-CHECK C: "Plástic[ao] (lote/qtd/mochila)" → protective
    -- Excluir somente quando "sacola" está nos parênteses (aquela = commercial bag/gift)
    IF  v_n ~ '^plástic[ao]\s+(embalad|de\s+\d)'
     OR (v_n ~ '^plástic[ao]\s*\(' AND v_n !~ 'sacola') THEN
        RETURN jsonb_build_object('raw',p_packing_type,'classification','protective',
            'is_commercial',FALSE,'is_protective',TRUE,'can_be_customized',FALSE,'has_image_expected',FALSE);
    END IF;

    -- COMMERCIAL
    IF  v_n ~ '(caixa|box|caixinha)'
     OR v_n ~ '(kraft|cartonagem|cartão|cartao|carton)'
     OR v_n ~ '(bolsa|\ybag\y|sacola|saco de algodão|saco de algodao)'
     OR v_n ~ '(tnt|non-woven|non woven|nonwoven)'
     OR v_n ~ '(estojo|case|pouch|pochete)'
     OR v_n ~ '(maleta|mala|porta-)'
     OR v_n ~ '(sleeve|luva|manga craft|manga branca|manga preta|manga de cortiça|manga de cortica|manga kraft|manga cartão|manga cartao|manga de papel|manga de bambu)'
     OR v_n ~ '(presente|gift|oferta|luxo|premium)'
     OR v_n ~ '(veludo|velvet|madeira|wood|bambu|bamboo|bambu print)'
     OR v_n ~ '(lata|tin|metal[^ó]|metálica|alumínio|aluminio)'
     OR v_n ~ '(acrílico|acrilico|acrylic)'
     OR v_n ~ '(couro|leather|^pu$|courino)'
     OR v_n ~ '(berço|berco|espuma|eva)'
     OR v_n ~ '(blister)'
     OR v_n ~ '(saco de algodão|saco algodão|saco algodao)'
     OR v_n ~ 'embalados na sacola|embalados no kit|embalada na sacola'
    THEN
        RETURN jsonb_build_object('raw',p_packing_type,'classification','commercial',
            'is_commercial',TRUE,'is_protective',FALSE,'can_be_customized',TRUE,'has_image_expected',TRUE);

    -- PROTECTIVE
    ELSIF v_n ~ '(saquinho|saco plástico|saco plastico)'
       OR v_n ~ '(película|pelicula|plástico bolha|plastico bolha|plástica bolha)'
       OR v_n ~ '(filme|shrink|stretch|celofane|cello)'
       OR v_n ~ '(bolha|bubble|aderente)'
       OR v_n ~ '(plástico em vácuo|plastico em vacuo|em vácuo|em vacuo)'
       OR v_n ~ '(papel seda|manga plástico|manga plastico)'
       OR v_n ~ '(tabuleiro de plástico|tabuleiro)'
       OR v_n ~ '(zip lock|ziplock|zip-lock|fecho adesivo|fecho c/|c/ fecho)'
       OR v_n ~ '(plástico vedado|plástica vedada|plastico vedado|plastica vedada|vedado)'
       OR v_n ~ '^plástic[ao]\.?\s*$'
       OR v_n ~ '^plastic[ao]\.?\s*$'
       OR v_n ~ '^plástic\s*$'
       OR (v_n ~ '^saco plástico' AND v_n !~ '(algodão|algodao|tnt|non-woven|veludo|kraft|papel de|cartão|cartao)')
       OR v_n ~ '^embalagem plástica( individual)?\.?$'
       OR v_n ~ '^(sem |nenhum|nenhuma|n\/a|sem embalagem|sem embagem|a granel)'
       OR v_n IN ('sem','nenhum','nenhuma','n/a','a granel')
       OR v_n ~ '(película retrátil|pelicula retratil|manga plástica$|manga plastica$)'
    THEN
        RETURN jsonb_build_object('raw',p_packing_type,'classification','protective',
            'is_commercial',FALSE,'is_protective',TRUE,'can_be_customized',FALSE,'has_image_expected',FALSE);
    ELSE
        RETURN jsonb_build_object('raw',p_packing_type,'classification','unknown',
            'is_commercial',FALSE,'is_protective',FALSE,'can_be_customized',FALSE,'has_image_expected',FALSE);
    END IF;
END;
$function$
