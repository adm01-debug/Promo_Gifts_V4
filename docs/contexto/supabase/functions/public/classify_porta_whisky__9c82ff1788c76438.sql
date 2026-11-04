CREATE OR REPLACE FUNCTION public.classify_porta_whisky(product_name text)
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
    v_capacidade_ml INTEGER;
    v_tipo TEXT;
    v_tem_kit BOOLEAN DEFAULT FALSE;
BEGIN
    -- Normaliza nome do produto
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    -- ============================================
    -- DETECÇÃO DE MATERIAL
    -- ============================================
    CASE
        WHEN v_name ~ 'INOX|INOXIDAVEL' THEN v_material := 'Inox';
        WHEN v_name ~ 'ACO' THEN v_material := 'Aço';
        WHEN v_name ~ 'COURO' THEN v_material := 'Couro';
        WHEN v_name ~ 'METAL' THEN v_material := 'Metal';
        WHEN v_name ~ 'PLASTICO' THEN v_material := 'Plástico';
        ELSE v_material := 'Inox'; -- Default mais comum
    END CASE;
    
    -- ============================================
    -- DETECÇÃO DE CAPACIDADE (ML)
    -- ============================================
    v_capacidade_ml := (regexp_match(v_name, '(\d+)\s*ML'))[1]::INTEGER;
    
    -- Se não encontrou ML, tenta OZ (onças) -> converte para ML
    IF v_capacidade_ml IS NULL THEN
        DECLARE
            v_oz INTEGER;
        BEGIN
            v_oz := (regexp_match(v_name, '(\d+)\s*OZ'))[1]::INTEGER;
            IF v_oz IS NOT NULL THEN
                v_capacidade_ml := (v_oz * 29.5735)::INTEGER; -- 1 oz = 29.5735 ml
            END IF;
        END;
    END IF;
    
    -- ============================================
    -- DETECÇÃO DE TIPO/VARIAÇÃO
    -- ============================================
    CASE
        WHEN v_name ~ 'KIT' THEN 
            v_tipo := 'Kit (com copos)';
            v_tem_kit := TRUE;
        WHEN v_name ~ 'EXECUTIVO|ELEGANTE|PREMIUM' THEN 
            v_tipo := 'Executivo';
        WHEN v_name ~ 'CLASSICO|TRADICIONAL' THEN 
            v_tipo := 'Clássico';
        WHEN v_name ~ 'PERSONALIZADO|GRAVACAO' THEN 
            v_tipo := 'Personalizável';
        ELSE 
            v_tipo := 'Padrão';
    END CASE;
    
    -- ============================================
    -- DEFINE CATEGORIA (sempre Cantil | Porta Whisky)
    -- ============================================
    v_slug := 'cantil_porta_whisky';
    
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
        'capacidade_ml', v_capacidade_ml,
        'tipo', v_tipo,
        'tem_kit', v_tem_kit
    );
END;
$function$
