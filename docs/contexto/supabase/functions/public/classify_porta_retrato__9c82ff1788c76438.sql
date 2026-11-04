CREATE OR REPLACE FUNCTION public.classify_porta_retrato(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_category_id UUID;
    v_category_slug TEXT;
    v_attributes JSONB;
BEGIN
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    v_category_slug := 'porta_retrato';
    
    SELECT id INTO v_category_id 
    FROM categories 
    WHERE slug = v_category_slug 
    LIMIT 1;
    
    v_attributes := jsonb_build_object(
        'material', CASE
            WHEN v_name ~ 'MADEIRA|WOOD|MDF|BAMBU|BAMBOO' THEN 'madeira'
            WHEN v_name ~ 'METAL|ALUMINIO|INOX' THEN 'metal'
            WHEN v_name ~ 'VIDRO|GLASS' THEN 'vidro'
            WHEN v_name ~ 'ACRILICO|ACRYLIC' THEN 'acrilico'
            WHEN v_name ~ 'PLASTICO|PLASTIC' THEN 'plastico'
            WHEN v_name ~ 'COURO|LEATHER|PU' THEN 'couro'
            ELSE NULL
        END,
        'tamanho_foto', CASE
            WHEN v_name ~ '10.?X.?15|10X15' THEN '10x15'
            WHEN v_name ~ '15.?X.?21|15X21' THEN '15x21'
            WHEN v_name ~ '20.?X.?25|20X25' THEN '20x25'
            WHEN v_name ~ '13.?X.?18|13X18' THEN '13x18'
            WHEN v_name ~ '3.?X.?4|3X4' THEN '3x4'
            ELSE NULL
        END,
        'tipo', CASE
            WHEN v_name ~ 'DIGITAL|LED|LCD|ELETRONICO' THEN 'digital'
            WHEN v_name ~ 'PAREDE|WALL' THEN 'parede'
            ELSE 'mesa'
        END,
        'formato', CASE
            WHEN v_name ~ 'HORIZONTAL|PAISAGEM' THEN 'horizontal'
            WHEN v_name ~ 'VERTICAL|RETRATO' THEN 'vertical'
            WHEN v_name ~ 'QUADRADO|SQUARE' THEN 'quadrado'
            ELSE NULL
        END,
        'qtd_fotos', (regexp_match(v_name, '([0-9]+).?FOTOS'))[1],
        'is_giratoria', v_name ~ 'GIRATORIA|GIRATORIO|ROTATIVO'
    );
    
    RETURN jsonb_build_object(
        'category_id', v_category_id,
        'category_slug', v_category_slug,
        'attributes', v_attributes
    );
END;
$function$
