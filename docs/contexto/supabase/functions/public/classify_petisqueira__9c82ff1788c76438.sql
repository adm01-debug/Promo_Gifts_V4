CREATE OR REPLACE FUNCTION public.classify_petisqueira(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_category_id UUID;
    v_category_slug TEXT;
    v_material TEXT;
BEGIN
    -- 1. NORMALIZAR NOME (maiúsculas, sem acentos)
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    -- 2. CLASSIFICAR POR MATERIAL (ordem: mais específico primeiro)
    CASE
        -- BAMBU: materiais de bambu (mais específico)
        WHEN v_name ~ 'BAMBU|BAMBOO' THEN
            v_material := 'BAMBU';
            SELECT id, slug INTO v_category_id, v_category_slug
            FROM categories WHERE slug = 'petisqueira-bambu' LIMIT 1;
            
        -- VIDRO: materiais de vidro/cristal
        WHEN v_name ~ 'VIDRO|CRISTAL|GLASS' THEN
            v_material := 'VIDRO';
            SELECT id, slug INTO v_category_id, v_category_slug
            FROM categories WHERE slug = 'petisqueira-vidro' LIMIT 1;
            
        -- CERÂMICA: materiais cerâmicos
        WHEN v_name ~ 'CERAMIC|CERAMICA|PORCELANA|GRES|FAIANCA|LOUÇA|LOUCA' THEN
            v_material := 'CERAMICA';
            SELECT id, slug INTO v_category_id, v_category_slug
            FROM categories WHERE slug = 'petisqueira-ceramica' LIMIT 1;
            
        -- PLÁSTICO: materiais plásticos
        WHEN v_name ~ 'PLASTIC|PLASTICO|PVC|POLIPROPILENO|PP|ACRILIC|MELAMINA|SILICONE' THEN
            v_material := 'PLASTICO';
            SELECT id, slug INTO v_category_id, v_category_slug
            FROM categories WHERE slug = 'petisqueira-plastico' LIMIT 1;
            
        -- MADEIRA: materiais de madeira (avaliar após bambu)
        WHEN v_name ~ 'MADEIRA|WOOD|MDF|PINUS|EUCALIPTO|CARVALHO|TECA|MOGNO' THEN
            v_material := 'MADEIRA';
            SELECT id, slug INTO v_category_id, v_category_slug
            FROM categories WHERE slug = 'petisqueira-madeira' LIMIT 1;
            
        -- GENÉRICO: sem material especificado → vai para categoria PAI
        ELSE
            v_material := 'GENERICO';
            SELECT id, slug INTO v_category_id, v_category_slug
            FROM categories WHERE slug = 'petisqueiras' LIMIT 1;
    END CASE;
    
    -- 3. FALLBACK se categoria não encontrada
    IF v_category_id IS NULL THEN
        SELECT id, slug INTO v_category_id, v_category_slug
        FROM categories WHERE slug = 'petisqueiras' LIMIT 1;
        v_material := 'GENERICO';
    END IF;
    
    -- 4. RETORNO
    RETURN jsonb_build_object(
        'category_id', v_category_id,
        'category_slug', v_category_slug,
        'material', v_material
    );
END;
$function$
