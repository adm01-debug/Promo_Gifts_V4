CREATE OR REPLACE FUNCTION public.classify_kit_banho(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_category_id UUID;
    v_category_slug TEXT;
    v_is_kit_banho BOOLEAN;
BEGIN
    -- 1. NORMALIZAR NOME (maiúsculas, sem acentos)
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    -- 2. VERIFICAR SE É KIT BANHO/SPA
    -- Padrões identificadores de Kit Banho/Spa:
    --   • KIT + (BANHO|SPA|RELAXANTE|AROMATERAPIA|WELLNESS|BEM-ESTAR)
    --   • Combinações com produtos típicos: SABONETE, SHAMPOO, SAIS, ÓLEO, ESPUMA, HIDRATANTE
    --   • Termos específicos: BATH SET, BODY CARE, SKIN CARE (em kits)
    
    IF v_name ~ 'KIT.*(BANHO|SPA|RELAXA|AROMAT|WELLNESS|BEM.?ESTAR|BODY.?CARE|SKIN.?CARE|BATH)' OR
       v_name ~ '(BANHO|SPA).*(KIT|SET|CONJUNTO)' OR
       v_name ~ 'KIT.*(SABONETE|SHAMPOO|SAIS|OLEO|ESPUMA|HIDRATANTE|ESFOLIANTE|LOCAO|CREME)' OR
       v_name ~ 'SET.*(BANHO|SPA|BATH|RELAXA)' THEN
        
        v_is_kit_banho := TRUE;
        SELECT id, slug INTO v_category_id, v_category_slug
        FROM categories WHERE slug = 'kit_banho_kit_spa' LIMIT 1;
    ELSE
        v_is_kit_banho := FALSE;
        v_category_id := NULL;
        v_category_slug := NULL;
    END IF;
    
    -- 3. RETORNO
    RETURN jsonb_build_object(
        'category_id', v_category_id,
        'category_slug', v_category_slug,
        'is_kit_banho', v_is_kit_banho
    );
END;
$function$
