CREATE OR REPLACE FUNCTION public.fn_auto_criar_equivalencia_spot()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_variation_id UUID;
    v_confidence INT;
    v_note TEXT;
BEGIN
    -- Verificar se já existe equivalência
    IF EXISTS (
        SELECT 1 FROM color_equivalences 
        WHERE supplier_color_id = NEW.id
    ) THEN
        RETURN NEW;
    END IF;
    
    -- Buscar melhor match por nome
    SELECT 
        cv.id,
        CASE 
            WHEN LOWER(TRIM(cv.name)) = LOWER(TRIM(NEW.name)) THEN 100
            WHEN LOWER(cv.name) LIKE LOWER(TRIM(NEW.name)) || '%' THEN 95
            WHEN LOWER(TRIM(NEW.name)) LIKE LOWER(cv.name) || '%' THEN 90
            ELSE 80
        END,
        CASE 
            WHEN LOWER(TRIM(cv.name)) = LOWER(TRIM(NEW.name)) THEN 'Match exato automático'
            ELSE 'Match por similaridade automático'
        END
    INTO v_variation_id, v_confidence, v_note
    FROM color_variations cv
    WHERE cv.is_active = true
      AND (
          LOWER(TRIM(cv.name)) = LOWER(TRIM(NEW.name))
          OR LOWER(cv.name) LIKE LOWER(TRIM(NEW.name)) || '%'
          OR LOWER(TRIM(NEW.name)) LIKE LOWER(cv.name) || '%'
      )
    ORDER BY 
        CASE WHEN LOWER(TRIM(cv.name)) = LOWER(TRIM(NEW.name)) THEN 1 ELSE 2 END,
        LENGTH(cv.name)
    LIMIT 1;
    
    -- Se encontrou match, criar equivalência
    IF v_variation_id IS NOT NULL THEN
        INSERT INTO color_equivalences (
            organization_id,
            supplier_color_id,
            promo_variation_id,
            confidence_score,
            verified,
            source,
            notes,
            is_active
        ) VALUES (
            NEW.organization_id,
            NEW.id,
            v_variation_id,
            v_confidence,
            false,  -- Não verificado (automático)
            'automatic_trigger',
            v_note,
            true
        );
    END IF;
    
    RETURN NEW;
END;
$function$
