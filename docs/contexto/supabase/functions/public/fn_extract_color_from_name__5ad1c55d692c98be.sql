CREATE OR REPLACE FUNCTION public.fn_extract_color_from_name(p_name text)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name_lower TEXT;
    v_colors TEXT[] := '{}';
BEGIN
    v_name_lower := LOWER(unaccent(COALESCE(p_name, '')));
    
    IF v_name_lower ~ '\m(preto|preta|black)\M' THEN v_colors := array_append(v_colors, 'Preto'); END IF;
    IF v_name_lower ~ '\m(branco|branca|white)\M' THEN v_colors := array_append(v_colors, 'Branco'); END IF;
    IF v_name_lower ~ '\m(azul|blue)\M' THEN v_colors := array_append(v_colors, 'Azul'); END IF;
    IF v_name_lower ~ '\m(vermelho|vermelha|red)\M' THEN v_colors := array_append(v_colors, 'Vermelho'); END IF;
    IF v_name_lower ~ '\m(verde|green)\M' THEN v_colors := array_append(v_colors, 'Verde'); END IF;
    IF v_name_lower ~ '\m(amarelo|amarela|yellow)\M' THEN v_colors := array_append(v_colors, 'Amarelo'); END IF;
    IF v_name_lower ~ '\m(laranja|orange)\M' THEN v_colors := array_append(v_colors, 'Laranja'); END IF;
    IF v_name_lower ~ '\m(rosa|pink)\M' THEN v_colors := array_append(v_colors, 'Rosa'); END IF;
    IF v_name_lower ~ '\m(roxo|roxa|purple|violeta)\M' THEN v_colors := array_append(v_colors, 'Roxo'); END IF;
    IF v_name_lower ~ '\m(cinza|cinzento|grey|gray)\M' THEN v_colors := array_append(v_colors, 'Cinza'); END IF;
    IF v_name_lower ~ '\m(marrom|marron|brown)\M' THEN v_colors := array_append(v_colors, 'Marrom'); END IF;
    IF v_name_lower ~ '\m(bege|beige)\M' THEN v_colors := array_append(v_colors, 'Bege'); END IF;
    IF v_name_lower ~ '\m(dourado|dourada|gold)\M' THEN v_colors := array_append(v_colors, 'Dourado'); END IF;
    IF v_name_lower ~ '\m(prata|prateado|prateada|silver)\M' THEN v_colors := array_append(v_colors, 'Prata'); END IF;
    IF v_name_lower ~ '\m(cromado|cromada|chrome)\M' THEN v_colors := array_append(v_colors, 'Cromado'); END IF;
    IF v_name_lower ~ '\m(transparente|cristal|clear)\M' THEN v_colors := array_append(v_colors, 'Transparente'); END IF;
    IF v_name_lower ~ '\m(natural|cru)\M' THEN v_colors := array_append(v_colors, 'Natural'); END IF;
    
    RETURN v_colors;
END;
$function$
