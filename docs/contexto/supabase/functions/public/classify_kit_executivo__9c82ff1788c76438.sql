CREATE OR REPLACE FUNCTION public.classify_kit_executivo(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_category_id UUID;
    v_category_slug TEXT;
    v_qtd_pecas INTEGER;
    v_attributes JSONB;
BEGIN
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    -- Categoria fixa (sem subcategorias)
    v_category_slug := 'kit_executivo';
    
    SELECT id INTO v_category_id 
    FROM categories 
    WHERE slug = v_category_slug 
    LIMIT 1;
    
    -- Detectar quantidade de pecas
    IF v_name ~ '(\d+)\s*(PECAS|PCS|PC|PEC)' THEN
        v_qtd_pecas := (regexp_match(v_name, '(\d+)\s*(PECAS|PCS|PC|PEC)'))[1]::INTEGER;
    ELSIF v_name ~ '2\s*(EM|IN)\s*1|DUPLO' THEN
        v_qtd_pecas := 2;
    ELSIF v_name ~ '3\s*(EM|IN)\s*1|TRIPLO' THEN
        v_qtd_pecas := 3;
    ELSE
        v_qtd_pecas := NULL;
    END IF;
    
    -- Atributos - detectar componentes
    v_attributes := jsonb_build_object(
        'qtd_pecas', v_qtd_pecas,
        'inclui_caneta', v_name ~ 'CANETA|ESFEROGRAFICA|ESFERO|PEN\b',
        'inclui_lapiseira', v_name ~ 'LAPISEIRA|LAPISEIRO',
        'inclui_caderneta', v_name ~ 'CADERNETA|CADERNO|BLOCO|MOLESKINE',
        'inclui_agenda', v_name ~ 'AGENDA|PLANNER',
        'inclui_porta_cartao', v_name ~ 'PORTA.?CARTAO|PORTA.?CARTOES|CARTEIRA',
        'inclui_chaveiro', v_name ~ 'CHAVEIRO',
        'inclui_estojo', v_name ~ 'ESTOJO|CAIXA|BOX|MALETA|EMBALAGEM',
        'material_estojo', CASE
            WHEN v_name ~ 'COURO|LEATHER|PU\b' THEN 'couro'
            WHEN v_name ~ 'MADEIRA|WOOD|MDF' THEN 'madeira'
            WHEN v_name ~ 'METAL|ALUMINIO|INOX' THEN 'metal'
            WHEN v_name ~ 'PAPEL|KRAFT|PAPELAO' THEN 'papel'
            WHEN v_name ~ 'PLASTICO|ACRILICO' THEN 'plastico'
            ELSE NULL
        END
    );
    
    RETURN jsonb_build_object(
        'category_id', v_category_id,
        'category_slug', v_category_slug,
        'qtd_pecas', v_qtd_pecas,
        'attributes', v_attributes
    );
END;
$function$
