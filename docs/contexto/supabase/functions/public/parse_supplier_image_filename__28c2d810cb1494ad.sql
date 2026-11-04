CREATE OR REPLACE FUNCTION public.parse_supplier_image_filename(p_filename text, p_supplier_code character varying DEFAULT 'spot'::character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
    v_base TEXT;
    v_extension TEXT;
    v_product_ref TEXT;
    v_color_code TEXT;
    v_suffix TEXT;
    v_sequence_num INT;
    v_is_color_specific BOOLEAN := true;
    v_match TEXT[];
BEGIN
    -- Validar input
    IF p_filename IS NULL OR p_filename = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Filename vazio ou nulo',
            'supplier_code', p_supplier_code
        );
    END IF;
    
    -- Separar extensão
    IF p_filename LIKE '%.%' THEN
        v_base := regexp_replace(p_filename, '\.[^.]+$', '');
        v_extension := upper(regexp_replace(p_filename, '^.*\.', ''));
    ELSE
        v_base := p_filename;
        v_extension := NULL;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- PARSING PARA PROMO_BRINDES (interno)
    -- ═══════════════════════════════════════════════════════════════════════
    IF upper(p_supplier_code) = 'PROMO_BRINDES' THEN
        
        -- PADRÃO 1: Por cor, múltiplo - {produto}_{cor}-vp-{n} ou {produto}_{cor}-va-{n}
        IF v_base ~ '^[0-9]+_[0-9]+-(vp|va)-[0-9]+$' THEN
            v_match := regexp_match(v_base, '^([0-9]+)_([0-9]+)-(vp|va)-([0-9]+)$');
            IF v_match IS NOT NULL THEN
                v_product_ref := v_match[1];
                v_color_code := v_match[2];
                v_suffix := '_cor-' || v_match[3] || '-#';
                v_sequence_num := v_match[4]::INT;
                v_is_color_specific := true;
            END IF;
        
        -- PADRÃO 2: Por cor, único - {produto}_{cor}-vp ou {produto}_{cor}-va
        ELSIF v_base ~ '^[0-9]+_[0-9]+-(vp|va)$' THEN
            v_match := regexp_match(v_base, '^([0-9]+)_([0-9]+)-(vp|va)$');
            IF v_match IS NOT NULL THEN
                v_product_ref := v_match[1];
                v_color_code := v_match[2];
                v_suffix := '_cor-' || v_match[3];
                v_is_color_specific := true;
            END IF;
        
        -- PADRÃO 3: Raiz, múltiplo - {produto}-vp-{n} ou {produto}-va-{n}
        ELSIF v_base ~ '^[0-9]+-(vp|va)-[0-9]+$' THEN
            v_match := regexp_match(v_base, '^([0-9]+)-(vp|va)-([0-9]+)$');
            IF v_match IS NOT NULL THEN
                v_product_ref := v_match[1];
                v_suffix := '-' || v_match[2] || '-#';
                v_sequence_num := v_match[3]::INT;
                v_is_color_specific := false;
                v_color_code := NULL;
            END IF;
        
        -- PADRÃO 4: Raiz, único - {produto}-vp ou {produto}-va
        ELSIF v_base ~ '^[0-9]+-(vp|va)$' THEN
            v_match := regexp_match(v_base, '^([0-9]+)-(vp|va)$');
            IF v_match IS NOT NULL THEN
                v_product_ref := v_match[1];
                v_suffix := '-' || v_match[2];
                v_is_color_specific := false;
                v_color_code := NULL;
            END IF;
        
        -- PADRÃO NÃO RECONHECIDO
        ELSE
            v_suffix := '(desconhecido)';
            v_match := regexp_match(v_base, '^([0-9]+)');
            IF v_match IS NOT NULL THEN
                v_product_ref := v_match[1];
            END IF;
        END IF;
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- PARSING PARA SPOT (fornecedor externo)
    -- ═══════════════════════════════════════════════════════════════════════
    ELSIF upper(p_supplier_code) = 'SPOT' THEN
        
        -- PADRÃO 1: Área de gravação (_#_#_#)
        IF v_base ~ '^[0-9]+_[0-9]+_[0-9]+_[0-9]+$' THEN
            v_match := regexp_match(v_base, '^([0-9]+)_([0-9]+)_([0-9]+)_([0-9]+)$');
            IF v_match IS NOT NULL THEN
                v_product_ref := v_match[1];
                v_suffix := '_#_#_#';
                v_is_color_specific := false;
                v_color_code := NULL;
            END IF;
        
        -- PADRÃO 2: Localização (_C#_L#)
        ELSIF v_base ~ '_C[0-9]+_L[0-9]+$' THEN
            v_match := regexp_match(v_base, '^([0-9]+)_([0-9]+)_C([0-9]+)_L([0-9]+)$');
            IF v_match IS NOT NULL THEN
                v_product_ref := v_match[1];
                v_color_code := v_match[2];
                v_suffix := '_C#_L#';
                v_is_color_specific := true;
            END IF;
        
        -- PADRÃO 3: Componente (_C#)
        ELSIF v_base ~ '_C[0-9]+$' THEN
            v_match := regexp_match(v_base, '^([0-9]+)_([0-9]+)_C([0-9]+)$');
            IF v_match IS NOT NULL THEN
                v_product_ref := v_match[1];
                v_color_code := v_match[2];
                v_suffix := '_C#';
                v_is_color_specific := true;
            END IF;
        
        -- PADRÃO 4: Set com underscore (_set)
        ELSIF v_base ~ '_set$' THEN
            v_match := regexp_match(v_base, '^([0-9]+)_set$');
            IF v_match IS NOT NULL THEN
                v_product_ref := v_match[1];
                v_suffix := '_set';
                v_is_color_specific := false;
                v_color_code := NULL;
            END IF;
        
        -- PADRÃO 5: Sufixos com hífen e cor
        ELSIF v_base ~ '^[0-9]+_[0-9]+-[a-zA-Z]+$' THEN
            v_match := regexp_match(v_base, '^([0-9]+)_([0-9]+)-([a-zA-Z]+)$');
            IF v_match IS NOT NULL THEN
                v_product_ref := v_match[1];
                v_color_code := v_match[2];
                v_suffix := '-' || lower(v_match[3]);
                
                CASE lower(v_match[3])
                    WHEN 'box' THEN v_is_color_specific := false;
                    WHEN 'pouch' THEN v_is_color_specific := false;
                    WHEN 'bag' THEN v_is_color_specific := false;
                    WHEN 'set' THEN v_is_color_specific := false;
                    ELSE v_is_color_specific := true;
                END CASE;
            END IF;
        
        -- PADRÃO 6: Imagem principal sem sufixo
        ELSIF v_base ~ '^[0-9]+_[0-9]+$' THEN
            v_match := regexp_match(v_base, '^([0-9]+)_([0-9]+)$');
            IF v_match IS NOT NULL THEN
                v_product_ref := v_match[1];
                v_color_code := v_match[2];
                v_suffix := '(sem sufixo)';
                v_is_color_specific := true;
            END IF;
        
        -- PADRÃO 7: Apenas referência do produto
        ELSIF v_base ~ '^[0-9]+$' THEN
            v_product_ref := v_base;
            v_suffix := '(sem sufixo)';
            v_is_color_specific := false;
        
        -- PADRÃO NÃO RECONHECIDO
        ELSE
            v_suffix := '(desconhecido)';
            v_match := regexp_match(v_base, '^([0-9]+)');
            IF v_match IS NOT NULL THEN
                v_product_ref := v_match[1];
            END IF;
        END IF;
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- OUTROS FORNECEDORES (genérico)
    -- ═══════════════════════════════════════════════════════════════════════
    ELSE
        v_suffix := '(desconhecido)';
        v_match := regexp_match(v_base, '^([0-9A-Za-z]+)');
        IF v_match IS NOT NULL THEN
            v_product_ref := v_match[1];
        END IF;
    END IF;
    
    -- Construir resultado
    v_result := jsonb_build_object(
        'success', true,
        'supplier_code', p_supplier_code,
        'filename', p_filename,
        'base', v_base,
        'extension', v_extension,
        'product_reference', v_product_ref,
        'color_code', v_color_code,
        'suffix_pattern', v_suffix,
        'is_color_specific', v_is_color_specific,
        'sequence_number', v_sequence_num
    );
    
    RETURN v_result;
END;
$function$
