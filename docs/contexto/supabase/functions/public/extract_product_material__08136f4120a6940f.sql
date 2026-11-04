CREATE OR REPLACE FUNCTION public.extract_product_material(product_name text, product_description text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_text TEXT;
    v_materials TEXT[] := '{}';
    v_primary_material TEXT;
    v_material_group TEXT;
    v_material_type_id UUID;
    v_material_type_slug TEXT;
BEGIN
    -- Normaliza e combina nome + descrição
    v_text := UPPER(unaccent(COALESCE(product_name, '') || ' ' || COALESCE(product_description, '')));
    
    -- ========================================================================
    -- DETECÇÃO DE MATERIAIS (ordem de prioridade)
    -- ========================================================================
    
    -- METAIS
    IF v_text ~ 'INOX|A[CÇ]O\s*INOX|STAINLESS' THEN
        v_materials := array_append(v_materials, 'ACO_INOX');
    END IF;
    
    IF v_text ~ 'ALUMIN' THEN
        v_materials := array_append(v_materials, 'ALUMINIO');
    END IF;
    
    IF v_text ~ 'COBRE|COPPER' THEN
        v_materials := array_append(v_materials, 'COBRE');
    END IF;
    
    IF v_text ~ 'ZINCO|ZINC' THEN
        v_materials := array_append(v_materials, 'ZINCO');
    END IF;
    
    IF v_text ~ 'LAT[AÃ]O|BRASS' THEN
        v_materials := array_append(v_materials, 'LATAO');
    END IF;
    
    IF v_text ~ 'METAL|METALIC' AND NOT v_text ~ 'SEMI.?METAL' THEN
        v_materials := array_append(v_materials, 'METAL');
    END IF;
    
    -- PLÁSTICOS
    IF v_text ~ '\mABS\M|ACRILONITRILA' THEN
        v_materials := array_append(v_materials, 'ABS');
    END IF;
    
    IF v_text ~ '\mPP\M|POLIPROPILENO' THEN
        v_materials := array_append(v_materials, 'POLIPROPILENO');
    END IF;
    
    IF v_text ~ '\mPET\M|TEREFTALATO' THEN
        v_materials := array_append(v_materials, 'PET');
    END IF;
    
    IF v_text ~ '\mPVC\M|VINIL' THEN
        v_materials := array_append(v_materials, 'PVC');
    END IF;
    
    IF v_text ~ 'ACRILIC' THEN
        v_materials := array_append(v_materials, 'ACRILICO');
    END IF;
    
    IF v_text ~ 'TRITAN' THEN
        v_materials := array_append(v_materials, 'TRITAN');
    END IF;
    
    IF v_text ~ 'SILICONE' THEN
        v_materials := array_append(v_materials, 'SILICONE');
    END IF;
    
    IF v_text ~ 'PLASTICO|PLASTIC' AND NOT v_text ~ 'RECICLAD' THEN
        v_materials := array_append(v_materials, 'PLASTICO');
    END IF;
    
    -- TECIDOS E FIBRAS
    IF v_text ~ 'POLIESTER|POLYESTER|600D|300D|1680D' THEN
        v_materials := array_append(v_materials, 'POLIESTER');
    END IF;
    
    IF v_text ~ 'NYLON|NAILON' THEN
        v_materials := array_append(v_materials, 'NYLON');
    END IF;
    
    IF v_text ~ 'ALGOD[AÃ]O|COTTON' THEN
        v_materials := array_append(v_materials, 'ALGODAO');
    END IF;
    
    IF v_text ~ 'CANVAS|LONA' THEN
        v_materials := array_append(v_materials, 'CANVAS');
    END IF;
    
    IF v_text ~ 'JUTA|JUTE' THEN
        v_materials := array_append(v_materials, 'JUTA');
    END IF;
    
    IF v_text ~ '\mTNT\M' THEN
        v_materials := array_append(v_materials, 'TNT');
    END IF;
    
    IF v_text ~ 'BRIM' THEN
        v_materials := array_append(v_materials, 'BRIM');
    END IF;
    
    -- COUROS
    IF v_text ~ '\mPU\M|COURO\s*SINT|COURINO|SINTETICO' THEN
        v_materials := array_append(v_materials, 'PU');
    END IF;
    
    IF v_text ~ 'COURO' AND NOT v_text ~ 'SINT|COURINO|\mPU\M' THEN
        v_materials := array_append(v_materials, 'COURO');
    END IF;
    
    -- NATURAIS/ECOLÓGICOS
    IF v_text ~ 'BAMBU|BAMBOO' THEN
        v_materials := array_append(v_materials, 'BAMBU');
    END IF;
    
    IF v_text ~ 'CORTI[CÇ]A|CORK' THEN
        v_materials := array_append(v_materials, 'CORTICA');
    END IF;
    
    IF v_text ~ 'MADEIRA|WOOD|\mMDF\M' THEN
        v_materials := array_append(v_materials, 'MADEIRA');
    END IF;
    
    IF v_text ~ 'PALHA|STRAW|FIBRA\s*DE\s*TRIGO|WHEAT' THEN
        v_materials := array_append(v_materials, 'PALHA');
    END IF;
    
    -- PAPÉIS
    IF v_text ~ 'KRAFT' THEN
        v_materials := array_append(v_materials, 'KRAFT');
    END IF;
    
    IF v_text ~ 'PAPEL[AÃ]O|CARDBOARD' THEN
        v_materials := array_append(v_materials, 'PAPELAO');
    END IF;
    
    IF v_text ~ 'PAPEL' AND NOT v_text ~ 'PAPEL[AÃ]O' THEN
        v_materials := array_append(v_materials, 'PAPEL');
    END IF;
    
    -- VIDROS E CERÂMICAS
    IF v_text ~ 'VIDRO|GLASS|BOROSSILICATO|BOROSILICATE' THEN
        v_materials := array_append(v_materials, 'VIDRO');
    END IF;
    
    IF v_text ~ 'CER[AÂ]MICA|CERAMIC' THEN
        v_materials := array_append(v_materials, 'CERAMICA');
    END IF;
    
    IF v_text ~ 'PORCELANA|PORCELAIN' THEN
        v_materials := array_append(v_materials, 'PORCELANA');
    END IF;
    
    -- BORRACHAS E ESPUMAS
    IF v_text ~ '\mEVA\M' THEN
        v_materials := array_append(v_materials, 'EVA');
    END IF;
    
    IF v_text ~ 'NEOPRENE' THEN
        v_materials := array_append(v_materials, 'NEOPRENE');
    END IF;
    
    IF v_text ~ 'BORRACHA|RUBBER' THEN
        v_materials := array_append(v_materials, 'BORRACHA');
    END IF;
    
    -- ECOLÓGICOS/RECICLADOS
    IF v_text ~ 'RECICLAD|RECICLAV|RECYCLED' THEN
        v_materials := array_append(v_materials, 'RECICLADO');
    END IF;
    
    -- ========================================================================
    -- DETERMINAR MATERIAL PRIMÁRIO (primeiro da lista ou indefinido)
    -- ========================================================================
    
    IF array_length(v_materials, 1) > 0 THEN
        v_primary_material := v_materials[1];
    ELSE
        v_primary_material := 'INDEFINIDO';
        v_materials := array_append(v_materials, 'INDEFINIDO');
    END IF;
    
    -- ========================================================================
    -- DETERMINAR GRUPO DO MATERIAL
    -- ========================================================================
    
    v_material_group := CASE
        WHEN v_primary_material IN ('ACO_INOX', 'ALUMINIO', 'COBRE', 'ZINCO', 'LATAO', 'METAL') 
            THEN 'METAIS'
        WHEN v_primary_material IN ('ABS', 'POLIPROPILENO', 'PET', 'PVC', 'ACRILICO', 'TRITAN', 'SILICONE', 'PLASTICO') 
            THEN 'PLASTICOS'
        WHEN v_primary_material IN ('POLIESTER', 'NYLON', 'ALGODAO', 'CANVAS', 'JUTA', 'TNT', 'BRIM') 
            THEN 'TECIDOS'
        WHEN v_primary_material IN ('PU', 'COURO') 
            THEN 'COUROS'
        WHEN v_primary_material IN ('BAMBU', 'CORTICA', 'MADEIRA', 'PALHA') 
            THEN 'NATURAIS'
        WHEN v_primary_material IN ('KRAFT', 'PAPELAO', 'PAPEL') 
            THEN 'PAPEIS'
        WHEN v_primary_material IN ('VIDRO', 'CERAMICA', 'PORCELANA') 
            THEN 'VIDROS_CERAMICAS'
        WHEN v_primary_material IN ('EVA', 'NEOPRENE', 'BORRACHA') 
            THEN 'BORRACHAS'
        WHEN v_primary_material = 'RECICLADO' 
            THEN 'ECOLOGICOS'
        ELSE 'OUTROS'
    END;
    
    -- ========================================================================
    -- BUSCAR material_type_id NO BANCO (se existir)
    -- ========================================================================
    
    -- Mapear para slug do material_types
    v_material_type_slug := CASE v_primary_material
        WHEN 'ACO_INOX' THEN 'aco-inox'
        WHEN 'ALUMINIO' THEN 'aluminio'
        WHEN 'COBRE' THEN 'cobre'
        WHEN 'METAL' THEN 'metal'
        WHEN 'ABS' THEN 'abs-acrilonitrila-butadieno-estireno'
        WHEN 'POLIPROPILENO' THEN 'polipropileno'
        WHEN 'PET' THEN 'pet'
        WHEN 'ACRILICO' THEN 'acrilico'
        WHEN 'TRITAN' THEN 'tritan'
        WHEN 'SILICONE' THEN 'silicone'
        WHEN 'PLASTICO' THEN 'plastico'
        WHEN 'POLIESTER' THEN 'poliester'
        WHEN 'NYLON' THEN 'nylon'
        WHEN 'ALGODAO' THEN 'algodao'
        WHEN 'CANVAS' THEN 'canvas'
        WHEN 'JUTA' THEN 'juta'
        WHEN 'TNT' THEN 'tnt'
        WHEN 'PU' THEN 'pu-poliuretano'
        WHEN 'COURO' THEN 'couro'
        WHEN 'BAMBU' THEN 'bambu'
        WHEN 'CORTICA' THEN 'cortica'
        WHEN 'MADEIRA' THEN 'madeira'
        WHEN 'KRAFT' THEN 'kraft'
        WHEN 'PAPELAO' THEN 'papelao'
        WHEN 'PAPEL' THEN 'papel'
        WHEN 'VIDRO' THEN 'vidro'
        WHEN 'CERAMICA' THEN 'ceramica'
        WHEN 'PORCELANA' THEN 'porcelana'
        WHEN 'EVA' THEN 'eva'
        WHEN 'NEOPRENE' THEN 'neoprene'
        WHEN 'BORRACHA' THEN 'borracha'
        ELSE NULL
    END;
    
    -- Buscar ID no banco
    IF v_material_type_slug IS NOT NULL THEN
        SELECT id INTO v_material_type_id 
        FROM material_types 
        WHERE slug = v_material_type_slug 
        LIMIT 1;
    END IF;
    
    -- ========================================================================
    -- RETORNAR RESULTADO
    -- ========================================================================
    
    RETURN jsonb_build_object(
        'primary_material', v_primary_material,
        'all_materials', to_jsonb(v_materials),
        'material_group', v_material_group,
        'material_type_id', v_material_type_id,
        'material_type_slug', v_material_type_slug,
        'material_count', array_length(v_materials, 1),
        'attributes', jsonb_build_object(
            'is_eco', v_text ~ 'ECOLOGIC|RECICLAD|SUSTENTA|BIODEGRADA',
            'is_thermal', v_text ~ 'TERMIC|THERMAL|ISOLA',
            'is_waterproof', v_text ~ 'IMPERMEA|WATERPROOF|PROVA.*AGUA',
            'is_recycled', v_text ~ 'RECICLAD|RECYCLED',
            'is_premium', v_text ~ 'PREMIUM|LUXO|EXECUTIVE|EXECUTIV'
        )
    );
END;
$function$
