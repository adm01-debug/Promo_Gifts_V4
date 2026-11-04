CREATE OR REPLACE FUNCTION public.classify_marmita(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_id UUID;
    v_slug TEXT;
    v_material TEXT;
    v_tipo TEXT;
    v_capacidade_ml INTEGER;
    v_capacidade_litros NUMERIC(5,2);
    v_compartimentos INTEGER;
    v_termica BOOLEAN DEFAULT FALSE;
    v_hermetica BOOLEAN DEFAULT FALSE;
    v_com_talher BOOLEAN DEFAULT FALSE;
    v_com_alca BOOLEAN DEFAULT FALSE;
BEGIN
    -- Normaliza nome do produto
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    -- ============================================
    -- DETECÇÃO DE MATERIAL
    -- ============================================
    CASE
        WHEN v_name ~ 'INOX|INOXIDAVEL' THEN v_material := 'Inox';
        WHEN v_name ~ 'ALUMINIO' THEN v_material := 'Alumínio';
        WHEN v_name ~ 'VIDRO' THEN v_material := 'Vidro';
        WHEN v_name ~ 'PLASTICO|PP|POLIPROPILENO' THEN v_material := 'Plástico';
        WHEN v_name ~ 'BAMBU' THEN v_material := 'Bambu';
        ELSE v_material := 'Plástico'; -- Default mais comum
    END CASE;
    
    -- ============================================
    -- DETECÇÃO DE TIPO
    -- ============================================
    CASE
        WHEN v_name ~ 'BENTO\s*BOX' THEN 
            v_tipo := 'Bento Box';
        WHEN v_name ~ 'LUNCH\s*BOX' THEN 
            v_tipo := 'Lunch Box';
        WHEN v_name ~ 'LANCHEIRA' THEN 
            v_tipo := 'Lancheira';
        WHEN v_name ~ 'MARMITA' THEN 
            v_tipo := 'Marmita';
        ELSE 
            v_tipo := 'Marmita';
    END CASE;
    
    -- ============================================
    -- CARACTERÍSTICAS ESPECIAIS
    -- ============================================
    v_termica := (v_name ~ 'TERMICA|THERMAL|ISOLADA');
    v_hermetica := (v_name ~ 'HERMETICA|HERMETICO|VEDACAO');
    v_com_talher := (v_name ~ 'TALHER|GARFO|COLHER|KIT');
    v_com_alca := (v_name ~ 'ALCA|HANDLE|STRAP');
    
    -- ============================================
    -- DETECÇÃO DE COMPARTIMENTOS
    -- ============================================
    IF v_name ~ '(\d+)\s*COMPARTIMENTO' THEN
        v_compartimentos := (regexp_match(v_name, '(\d+)\s*COMPARTIMENTO'))[1]::INTEGER;
    ELSIF v_name ~ '(\d+)\s*ANDARES?' THEN
        v_compartimentos := (regexp_match(v_name, '(\d+)\s*ANDARES?'))[1]::INTEGER;
    ELSIF v_name ~ 'EMPILHAVEL|STACKABLE' THEN
        v_compartimentos := 2; -- Assume 2 se é empilhável
    ELSE
        v_compartimentos := 1; -- Default 1 compartimento
    END IF;
    
    -- ============================================
    -- DETECÇÃO DE CAPACIDADE (ML)
    -- ============================================
    IF v_name ~ '(\d+)\s*ML' THEN
        v_capacidade_ml := (regexp_match(v_name, '(\d+)\s*ML'))[1]::INTEGER;
    END IF;
    
    -- ============================================
    -- DETECÇÃO DE CAPACIDADE (LITROS)
    -- ============================================
    IF v_name ~ '(\d+(?:\.\d+)?)\s*L(?:ITROS?)?' AND v_capacidade_ml IS NULL THEN
        v_capacidade_litros := (regexp_match(v_name, '(\d+(?:\.\d+)?)\s*L(?:ITROS?)?'))[1]::NUMERIC;
        v_capacidade_ml := (v_capacidade_litros * 1000)::INTEGER;
    END IF;
    
    -- ============================================
    -- DEFINE CATEGORIA (sempre Marmitas | Lancheiras)
    -- ============================================
    v_slug := 'marmitas_lancheiras';
    
    -- Busca ID da categoria
    SELECT id INTO v_id 
    FROM categories 
    WHERE slug = v_slug 
    LIMIT 1;
    
    -- ============================================
    -- RETORNA JSONB COM CLASSIFICAÇÃO
    -- ============================================
    RETURN jsonb_build_object(
        'category_id', v_id,
        'category_slug', v_slug,
        'material', v_material,
        'tipo', v_tipo,
        'capacidade_ml', v_capacidade_ml,
        'compartimentos', v_compartimentos,
        'termica', v_termica,
        'hermetica', v_hermetica,
        'com_talher', v_com_talher,
        'com_alca', v_com_alca
    );
END;
$function$
