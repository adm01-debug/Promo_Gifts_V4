CREATE OR REPLACE FUNCTION public.classify_fone_ouvido(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_category_id UUID;
    v_category_slug TEXT;
    v_is_fone BOOLEAN;
BEGIN
    -- 1. NORMALIZAR NOME (maiúsculas, sem acentos)
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    -- 2. VERIFICAR SE É FONE DE OUVIDO
    -- Padrões identificadores:
    --   • FONE (DE OUVIDO)
    --   • HEADPHONE, HEADSET, EARPHONE, EARBUDS, EARPODS
    --   • AURICULAR, AUSCULTADOR
    --   • TWS (True Wireless Stereo)
    --   • INTRA-AURICULAR, OVER-EAR, ON-EAR
    
    IF v_name ~ 'FONE|HEADPHONE|HEADSET|EARPHONE|EARBUD|EARPOD|AURICULAR|AUSCULTADOR|TWS|INTRA.?AURICULAR|OVER.?EAR|ON.?EAR' THEN
        v_is_fone := TRUE;
        SELECT id, slug INTO v_category_id, v_category_slug
        FROM categories WHERE slug = 'fone-de-ouvido' LIMIT 1;
    ELSE
        v_is_fone := FALSE;
        v_category_id := NULL;
        v_category_slug := NULL;
    END IF;
    
    -- 3. RETORNO
    RETURN jsonb_build_object(
        'category_id', v_category_id,
        'category_slug', v_category_slug,
        'is_fone_ouvido', v_is_fone
    );
END;
$function$
