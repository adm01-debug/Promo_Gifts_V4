CREATE OR REPLACE FUNCTION public.fn_trigger_auto_extract_attributes()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_capacity INTEGER;
    v_dimensions JSONB;
    v_weight INTEGER;
    v_keywords TEXT[];
BEGIN
    -- Validação básica
    IF NEW.name IS NULL OR TRIM(NEW.name) = '' THEN
        RETURN NEW;
    END IF;
    
    -- Se UPDATE e nome não mudou, não fazer nada
    IF TG_OP = 'UPDATE' AND OLD.name = NEW.name THEN
        RETURN NEW;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════
    -- ❌ NÃO EXTRAIR CORES DO NOME
    -- ═══════════════════════════════════════════════════════════
    -- MOTIVO: Conflita com arquitetura existente de cores
    -- As cores devem vir de:
    --   product_variants.color_id → color_variations
    -- E serem agregadas em products.colors[] via função separada
    -- ═══════════════════════════════════════════════════════════
    
    -- 1. Extrair capacidade (ml/L)
    IF NEW.capacity_ml IS NULL THEN
        v_capacity := fn_extract_capacity_from_name(NEW.name);
        IF v_capacity IS NOT NULL THEN
            NEW.capacity_ml := v_capacity;
            NEW.has_capacity := true;
        END IF;
    END IF;
    
    -- 2. Extrair dimensões (AxBxC cm/mm)
    IF NEW.length_cm IS NULL AND NEW.width_cm IS NULL AND NEW.height_cm IS NULL THEN
        v_dimensions := fn_extract_dimensions_from_name(NEW.name);
        IF v_dimensions IS NOT NULL THEN
            NEW.length_cm := (v_dimensions->>'length_cm')::NUMERIC;
            NEW.width_cm := (v_dimensions->>'width_cm')::NUMERIC;
            NEW.height_cm := (v_dimensions->>'height_cm')::NUMERIC;
        END IF;
    END IF;
    
    -- 3. Extrair peso (g/kg)
    IF NEW.weight_g IS NULL THEN
        v_weight := fn_extract_weight_from_name(NEW.name);
        IF v_weight IS NOT NULL THEN
            NEW.weight_g := v_weight;
        END IF;
    END IF;
    
    -- 4. Extrair keywords (para SEO)
    IF NEW.meta_keywords IS NULL OR array_length(NEW.meta_keywords, 1) IS NULL THEN
        v_keywords := fn_extract_keywords_from_name(NEW.name);
        IF array_length(v_keywords, 1) > 0 THEN
            NEW.meta_keywords := v_keywords;
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro em fn_trigger_auto_extract_attributes: %', SQLERRM;
    RETURN NEW;
END;
$function$
