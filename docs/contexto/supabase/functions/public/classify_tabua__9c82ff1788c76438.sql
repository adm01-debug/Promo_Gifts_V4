CREATE OR REPLACE FUNCTION public.classify_tabua(product_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_is_tabua BOOLEAN := FALSE;
    v_material TEXT;
    v_category_id UUID;
    v_category_slug TEXT;
BEGIN
    -- 1. NORMALIZAÇÃO
    v_name := UPPER(unaccent(COALESCE(product_name, '')));
    
    -- ========================================================================
    -- 2. VALIDAÇÃO: É TÁBUA?
    -- ========================================================================
    -- EXCLUSÃO: Tábuas que são parte de kits (têm funções próprias)
    -- - Tábua de queijos COM utensílios = kit_queijo
    -- - Tábua para churrasco COM utensílios = kit_churrasco
    -- ========================================================================
    
    -- Primeiro verificar se é tábua
    IF v_name ~ 'TABUA|TÁBUA' THEN
        v_is_tabua := TRUE;
    END IF;
    
    -- EXCLUSÃO: Se for kit de queijo (tábua + utensílios)
    IF v_is_tabua AND v_name ~ 'QUEIJO' AND v_name ~ '(UTENSILIOS|UTENSÍLIOS|FACA|TALHERES|PECAS|PEÇAS|\d+\s*(PCS|PÇS))' THEN
        v_is_tabua := FALSE;  -- Será classificado por classify_kit_queijo()
    END IF;
    
    -- EXCLUSÃO: Se for kit de churrasco (tábua + utensílios)
    IF v_is_tabua AND v_name ~ 'CHURRASCO' AND v_name ~ '(UTENSILIOS|UTENSÍLIOS|FACA|GARFO|PECAS|PEÇAS|KIT|CONJUNTO|\d+\s*(PCS|PÇS))' THEN
        v_is_tabua := FALSE;  -- Será classificado por classify_kit_churrasco()
    END IF;
    
    -- Se NÃO é tábua (ou foi excluído), retornar imediatamente
    IF NOT v_is_tabua THEN
        RETURN jsonb_build_object(
            'is_tabua', FALSE,
            'category_id', NULL,
            'category_slug', NULL,
            'material', NULL
        );
    END IF;
    
    -- ========================================================================
    -- 3. IDENTIFICAÇÃO DO MATERIAL
    -- ========================================================================
    
    IF v_name ~ 'BAMBU|BAMBOO' THEN
        v_material := 'BAMBU';
        v_category_slug := 'tabua-cozinha-bambu';
    ELSIF v_name ~ 'MADEIRA|WOOD|MDF|PINUS|TECA' THEN
        v_material := 'MADEIRA';
        v_category_slug := 'tabua-cozinha-madeira';
    ELSIF v_name ~ 'PLASTIC|PVC|POLIETILENO|PP|SILICONE' THEN
        v_material := 'PLASTICO';
        v_category_slug := 'tabua-cozinha-plastico';
    ELSE
        v_material := 'GENERICO';
        v_category_slug := 'tabua-cozinha';
    END IF;
    
    -- Busca UUID da categoria
    SELECT id INTO v_category_id 
    FROM categories WHERE slug = v_category_slug LIMIT 1;
    
    -- Fallback para categoria pai
    IF v_category_id IS NULL THEN
        SELECT id INTO v_category_id 
        FROM categories WHERE slug = 'tabua-cozinha' LIMIT 1;
        v_category_slug := 'tabua-cozinha';
    END IF;
    
    -- 4. RETORNO
    RETURN jsonb_build_object(
        'is_tabua', TRUE,
        'category_id', v_category_id,
        'category_slug', v_category_slug,
        'material', v_material
    );
END;
$function$
