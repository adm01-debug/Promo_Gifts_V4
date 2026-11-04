CREATE OR REPLACE FUNCTION public.fn_extract_packaging_from_description(p_description text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_desc TEXT;
    v_type TEXT := NULL;
    v_text TEXT := NULL;
    v_gift BOOLEAN := FALSE;
    v_m TEXT[];
BEGIN
    IF p_description IS NULL OR TRIM(p_description) = '' THEN
        RETURN jsonb_build_object('found',FALSE,'packaging_type',NULL,'packaging_text',NULL,'is_gift_packaging',FALSE,'source','description');
    END IF;
    v_desc := LOWER(TRIM(p_description));

    -- P1: fornecid[oa]s? em X
    v_m := regexp_match(v_desc,'fornecid[oa]s?\s+em\s+(polybag|poly[\s-]?bag)','i');
    IF v_m[1] IS NOT NULL THEN v_type:='protective'; v_text:=v_m[1]; v_gift:=FALSE; END IF;

    IF v_type IS NULL THEN
        v_m := regexp_match(v_desc,'fornecid[oa]s?\s+em\s+(caixa(?:\s+(?:de\s+)?(?:presente|oferta|gift|kraft|preta|branca|individual|papelão|padrão))?)','i');
        IF v_m[1] IS NOT NULL THEN v_type:='box'; v_text:=v_m[1]; v_gift:=TRUE; END IF;
    END IF;

    IF v_type IS NULL THEN
        v_m := regexp_match(v_desc,'fornecid[oa]s?\s+em\s+(estojo(?:\s+(?:de\s+)?(?:veludo|couro|eva|madeira|plástico|acrílico|metal|bambu))?)','i');
        IF v_m[1] IS NOT NULL THEN v_type:='pouch'; v_text:=v_m[1]; v_gift:=TRUE; END IF;
    END IF;

    IF v_type IS NULL THEN
        v_m := regexp_match(v_desc,'fornecid[oa]s?\s+em\s+((?:bolsa|saco|sacola)(?:\s+(?:de\s+)?(?:tnt|non.?woven|algodão|tecido|papel|veludo|couro))?)','i');
        IF v_m[1] IS NOT NULL THEN v_type:='bag'; v_text:=v_m[1]; v_gift:=TRUE; END IF;
    END IF;

    -- P2: inclui/incluso em X
    IF v_type IS NULL THEN
        v_m := regexp_match(v_desc,'(?:inclus[oa]s?|inclu[ií]dos?|inclui)\s+(?:em\s+)?(caixa(?:\s+(?:de\s+)?(?:presente|oferta|gift|kraft|papelão|preta|branca))?)','i');
        IF v_m[1] IS NOT NULL THEN v_type:='box'; v_text:=v_m[1]; v_gift:=TRUE; END IF;
    END IF;

    IF v_type IS NULL THEN
        v_m := regexp_match(v_desc,'(?:inclus[oa]s?|inclu[ií]dos?|inclui)\s+(?:em\s+)?(estojo(?:\s+\S+)?)','i');
        IF v_m[1] IS NOT NULL THEN v_type:='pouch'; v_text:=v_m[1]; v_gift:=TRUE; END IF;
    END IF;

    -- P3: apresentad[oa]s? em X
    IF v_type IS NULL THEN
        v_m := regexp_match(v_desc,'apresentad[oa]s?\s+em\s+(caixa(?:\s+(?:de\s+)?(?:presente|oferta|gift|kraft))?)','i');
        IF v_m[1] IS NOT NULL THEN v_type:='box'; v_text:=v_m[1]; v_gift:=TRUE; END IF;
    END IF;
    IF v_type IS NULL THEN
        v_m := regexp_match(v_desc,'apresentad[oa]s?\s+em\s+(estojo(?:\s+\S+)?)','i');
        IF v_m[1] IS NOT NULL THEN v_type:='pouch'; v_text:=v_m[1]; v_gift:=TRUE; END IF;
    END IF;

    -- P4: Embalagem: X
    IF v_type IS NULL THEN
        v_m := regexp_match(v_desc,'embalagem[:\s]+(\S+(?:\s+\S+)?)','i');
        IF v_m[1] IS NOT NULL AND v_m[1] !~* 'adequada|para|individual|prot' THEN
            IF v_m[1] ~* '(polybag|poly\s*bag)' THEN v_type:='protective'; v_text:=v_m[1]; v_gift:=FALSE;
            ELSIF v_m[1] ~* '(caixa|box)' THEN v_type:='box'; v_text:=v_m[1]; v_gift:=v_m[1]~*'(presente|oferta|gift)';
            ELSIF v_m[1] ~* '(estojo|case)' THEN v_type:='pouch'; v_text:=v_m[1]; v_gift:=TRUE;
            ELSIF v_m[1] ~* '(bolsa|saco|bag)' THEN v_type:='bag'; v_text:=v_m[1]; v_gift:=v_m[1]!~*'(plástico|polybag)';
            END IF;
        END IF;
    END IF;

    -- P5: "com caixa de X" / "entregue em X" / "com estojo" (sem \b)
    IF v_type IS NULL THEN
        IF v_desc ~* 'com\s+caixa\s+(?:de\s+)?(?:presente|oferta|gift|kraft|papelão|preta|branca|individual)' THEN
            v_m := regexp_match(v_desc,'com\s+caixa\s+(?:de\s+)?((?:presente|oferta|gift|kraft|papelão|preta|branca|individual)(?:\s+\S+)?)','i');
            v_type:='box'; v_text:='caixa '||COALESCE(v_m[1],''); v_gift:=TRUE;
        ELSIF v_desc ~* 'entregue\s+em\s+(?:caixa|estojo|polybag)' THEN
            v_m := regexp_match(v_desc,'entregue\s+em\s+((?:caixa|estojo|polybag)(?:\s+\S+)?)','i');
            IF v_m[1] ~* 'polybag' THEN v_type:='protective'; v_text:=v_m[1]; v_gift:=FALSE;
            ELSIF v_m[1] ~* 'estojo' THEN v_type:='pouch'; v_text:=v_m[1]; v_gift:=TRUE;
            ELSE v_type:='box'; v_text:=v_m[1]; v_gift:=TRUE; END IF;
        ELSIF v_desc ~* 'com\s+estojo' THEN
            v_type:='pouch'; v_text:='estojo'; v_gift:=TRUE;
        END IF;
    END IF;

    -- P6: "embalado individualmente em X"
    IF v_type IS NULL THEN
        v_m := regexp_match(v_desc,'embalad[oa]s?\s+individualmente\s+em\s+((?:polybag|poly\s*bag|caixa|estojo)(?:\s+\S+)?)','i');
        IF v_m[1] IS NOT NULL THEN
            IF v_m[1] ~* 'polybag' THEN v_type:='protective'; v_text:=v_m[1]; v_gift:=FALSE;
            ELSE v_type:='box'; v_text:=v_m[1]; v_gift:=TRUE; END IF;
        END IF;
    END IF;

    IF v_type IS NOT NULL THEN
        RETURN jsonb_build_object('found',TRUE,'packaging_type',v_type,'packaging_text',INITCAP(TRIM(v_text)),'is_gift_packaging',v_gift,'source','description');
    ELSE
        RETURN jsonb_build_object('found',FALSE,'packaging_type',NULL,'packaging_text',NULL,'is_gift_packaging',FALSE,'source','description');
    END IF;
END;
$function$
