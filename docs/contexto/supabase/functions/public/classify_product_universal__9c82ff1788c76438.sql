CREATE OR REPLACE FUNCTION public.classify_product_universal(product_name text)
 RETURNS TABLE(category_id uuid, category_name text, category_slug text, category_level integer, category_path text, confidence text, detected_type text, detected_material text, attributes jsonb)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name TEXT;
    v_name_original TEXT;
    v_type TEXT := 'INDEFINIDO';
    v_material TEXT := 'INDEFINIDO';
    v_confidence TEXT := 'low';
    v_target_slug TEXT;
    v_fallback_slug TEXT;
    v_attributes JSONB := '{}'::JSONB;
    v_capacity_ml INTEGER;
    v_capacity_mah INTEGER;
    v_capacity_gb INTEGER;
    v_org_id UUID;
    v_cat_id UUID;
    v_cat_name TEXT;
    v_cat_slug TEXT;
    v_cat_level INTEGER;
    v_cat_path TEXT;
BEGIN
    -- Buscar organization_id
    SELECT id INTO v_org_id FROM organizations LIMIT 1;
    
    -- ========================================================================
    -- ETAPA 1: NORMALIZAÇÃO
    -- ========================================================================
    v_name_original := COALESCE(TRIM(product_name), '');
    v_name := UPPER(unaccent(v_name_original));
    v_name := REGEXP_REPLACE(v_name, '\s+', ' ', 'g');
    
    IF v_name = '' OR v_name IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::INTEGER, 
            NULL::TEXT, 'none'::TEXT, 'VAZIO'::TEXT, NULL::TEXT, '{}'::JSONB;
        RETURN;
    END IF;

    -- ========================================================================
    -- ETAPA 2: EXTRAÇÃO DE CAPACIDADES
    -- ========================================================================
    IF v_name ~ '(\d+)\s*(ML|MILILITRO)' THEN
        v_capacity_ml := (REGEXP_MATCH(v_name, '(\d+)\s*(ML|MILILITRO)'))[1]::INTEGER;
    ELSIF v_name ~ '(\d+)\s*(L|LITRO)' AND v_name !~ '(\d+)\s*(LED|LUZ)' THEN
        v_capacity_ml := (REGEXP_MATCH(v_name, '(\d+)\s*(L|LITRO)'))[1]::INTEGER * 1000;
    END IF;
    IF v_name ~ '(\d+)\s*MAH' THEN
        v_capacity_mah := (REGEXP_MATCH(v_name, '(\d+)\s*MAH'))[1]::INTEGER;
    END IF;
    IF v_name ~ '(\d+)\s*GB' THEN
        v_capacity_gb := (REGEXP_MATCH(v_name, '(\d+)\s*GB'))[1]::INTEGER;
    END IF;

    -- ========================================================================
    -- ETAPA 3: DETECÇÃO (ordem de prioridade)
    -- ========================================================================
    
    -- PRIORIDADE 100: TECNOLOGIA
    IF v_name ~ '(POWER\s*BANK|BATERIA\s*(EXTERNA|PORTATIL)|CARREGADOR\s*(PORTATIL|EXTERNO))' THEN
        v_type := 'POWER_BANK'; v_confidence := 'high';
        v_target_slug := 'tecnologia-eletronicos'; v_fallback_slug := 'tecnologia-eletronicos';
        v_attributes := jsonb_build_object('capacity_mah', v_capacity_mah, 
            'is_wireless', v_name ~ '(WIRELESS|SEM\s*FIO)', 'has_led', v_name ~ 'LED');
            
    ELSIF v_name ~ '(FONE|HEADPHONE|EARPHONE|EARBUDS|HEADSET|AURICULAR)' THEN
        v_type := 'FONE'; v_confidence := 'high';
        v_target_slug := 'tecnologia-eletronicos'; v_fallback_slug := 'tecnologia-eletronicos';
        v_attributes := jsonb_build_object('is_bluetooth', v_name ~ '(BLUETOOTH|TWS|SEM\s*FIO)', 'is_tws', v_name ~ 'TWS');
        
    ELSIF v_name ~ '(PEN[\s\-]?DRIVE|PENDRIVE|USB\s*FLASH|MEMORIA\s*USB)' THEN
        v_type := 'PEN_DRIVE'; v_confidence := 'high';
        v_target_slug := 'tecnologia-eletronicos'; v_fallback_slug := 'tecnologia-eletronicos';
        v_attributes := jsonb_build_object('capacity_gb', v_capacity_gb);
        
    ELSIF v_name ~ '(CAIXA\s*(DE\s*)?SOM|SPEAKER|ALTO[\s\-]?FALANTE)' THEN
        v_type := 'CAIXA_SOM'; v_confidence := 'high';
        v_target_slug := 'tecnologia-eletronicos'; v_fallback_slug := 'tecnologia-eletronicos';
        
    ELSIF v_name ~ 'MOUSE[\s\-]?PAD' THEN
        v_type := 'MOUSE_PAD'; v_confidence := 'high';
        v_target_slug := 'mouse_pad'; v_fallback_slug := 'papelaria_e_escritorio';
        
    ELSIF v_name ~ 'DESK[\s\-]?PAD' THEN
        v_type := 'DESK_PAD'; v_confidence := 'high';
        v_target_slug := 'desk_pad'; v_fallback_slug := 'papelaria_e_escritorio';
        
    ELSIF v_name ~ '(^|[^A-Z])MOUSE([^A-Z]|$)' AND NOT v_name ~ 'PAD' THEN
        v_type := 'MOUSE'; v_confidence := 'high';
        v_target_slug := 'tecnologia-eletronicos'; v_fallback_slug := 'tecnologia-eletronicos';
        
    ELSIF v_name ~ '(^|[^A-Z])TECLADO([^A-Z]|$)' THEN
        v_type := 'TECLADO'; v_confidence := 'high';
        v_target_slug := 'tecnologia-eletronicos'; v_fallback_slug := 'tecnologia-eletronicos';

    -- PRIORIDADE 95: CANETAS E ESCRITA
    ELSIF v_name ~ '(CANETA|ESFERO|ESFEROG|ROLLER|LAPISEIRA|MARCA[\s\-]?TEXTO)' THEN
        v_type := 'CANETA'; v_confidence := 'high';
        
        IF v_name ~ 'LAPISEIRA' THEN
            v_type := 'LAPISEIRA'; 
            v_target_slug := 'lapiseiras'; 
            v_fallback_slug := 'papelaria_e_escritorio';
            v_material := CASE WHEN v_name ~ '(METAL|INOX|ALUM)' THEN 'METAL' ELSE 'PLÁSTICO' END;
            
        ELSIF v_name ~ 'MARCA[\s\-]?TEXTO' THEN
            v_type := 'MARCA_TEXTO'; 
            v_target_slug := 'papelaria_e_escritorio'; 
            v_fallback_slug := 'papelaria_e_escritorio';
            v_material := 'PLÁSTICO';
            
        ELSIF v_name ~ '(ROLLER|ROLLERBALL)' THEN
            v_material := 'ROLLER'; 
            v_target_slug := 'canetas-roller'; 
            v_fallback_slug := 'canetas_metal';
            
        ELSIF v_name ~ '(SEMI[\s\-]?METAL|SEMIMETAL)' AND NOT v_name ~ 'SEMI\s*TRANSPAR' THEN
            v_material := 'SEMI METAL'; 
            v_target_slug := 'canetas_semi_metal'; 
            v_fallback_slug := 'canetas';
            
        ELSIF v_name ~ '(BAMBU|BAMBOO)' THEN
            v_material := 'BAMBU'; 
            v_target_slug := 'canetas-bambu'; 
            v_fallback_slug := 'canetas-ecologicas';
            
        ELSIF v_name ~ '(CORTI[CÇ]A|CORK)' THEN
            v_material := 'CORTIÇA'; 
            v_target_slug := 'canetas-ecologicas'; 
            v_fallback_slug := 'canetas';
            
        ELSIF v_name ~ '(ECOL[OÓ]GIC|RECICL|MADEIRA|FIBRA|SUSTENTAV)' THEN
            v_material := 'ECOLÓGICA'; 
            v_target_slug := 'canetas-ecologicas'; 
            v_fallback_slug := 'canetas';
            
        ELSIF v_name ~ '(METAL|INOX|ALUM[IÍ]N|A[CÇ]O|BRONZE|COBRE)' THEN
            v_material := 'METAL'; 
            v_target_slug := 'canetas_metal'; 
            v_fallback_slug := 'canetas';
            
        ELSIF v_name ~ '(PL[AÁ]STIC|ABS|ACR[IÍ]LIC|TRANSPAR|TRANSLUC)' THEN
            v_material := 'PLÁSTICO'; 
            v_target_slug := 'canetas_plastico'; 
            v_fallback_slug := 'canetas';
            
        ELSE
            v_material := 'INDEFINIDO'; 
            v_target_slug := 'canetas'; 
            v_fallback_slug := 'papelaria_e_escritorio';
            v_confidence := 'medium';
        END IF;
        
        v_attributes := jsonb_build_object(
            'has_touch', v_name ~ '(TOUCH|STYLUS)', 
            'has_laser', v_name ~ 'LASER',
            'has_lanterna', v_name ~ '(LANTERNA|LED|LUZ)',
            'ink_color', CASE 
                WHEN v_name ~ 'AZUL' THEN 'AZUL'
                WHEN v_name ~ 'PRET[AO]' THEN 'PRETO'
                WHEN v_name ~ 'VERMELH[AO]' THEN 'VERMELHO'
                ELSE NULL END
        );

    -- PRIORIDADE 90: GARRAFAS E SQUEEZES
    ELSIF v_name ~ '(GARRAFA|SQUEEZE|SQUEEZY|CANTIL)' THEN
        v_type := 'GARRAFA'; v_confidence := 'high';
        
        IF v_name ~ '(T[EÉ]RMIC|ISOTERM|VACUUM|ISOLANTE|PAREDE\s*DUPLA)' THEN
            v_type := 'GARRAFA_TERMICA'; 
            v_target_slug := 'garrafa_termica'; 
            v_fallback_slug := 'bar_e_cozinha';
            v_material := CASE WHEN v_name ~ '(INOX|A[CÇ]O)' THEN 'INOX' ELSE 'PLÁSTICO' END;
            
        ELSIF v_name ~ '(SQUEEZE|SQUEEZY)' THEN
            v_type := 'SQUEEZE'; 
            v_target_slug := 'bar_e_cozinha'; 
            v_fallback_slug := 'bar_e_cozinha';
            v_confidence := 'medium';
            v_material := CASE 
                WHEN v_name ~ 'ALUM' THEN 'ALUMÍNIO' 
                WHEN v_name ~ 'INOX' THEN 'INOX' 
                ELSE 'PLÁSTICO' END;
                
        ELSIF v_name ~ 'CANTIL' THEN
            v_type := 'CANTIL'; 
            v_target_slug := 'cantil_porta_whisky'; 
            v_fallback_slug := 'bar_e_cozinha';
            v_material := 'INOX';
            
        ELSE
            v_target_slug := 'bar_e_cozinha'; 
            v_fallback_slug := 'bar_e_cozinha';
            v_confidence := 'medium';
            v_material := CASE 
                WHEN v_name ~ '(VIDRO|GLASS)' THEN 'VIDRO'
                WHEN v_name ~ '(INOX|A[CÇ]O)' THEN 'INOX'
                WHEN v_name ~ 'ALUM' THEN 'ALUMÍNIO'
                ELSE 'PLÁSTICO' END;
        END IF;
        
        v_attributes := jsonb_build_object(
            'capacity_ml', v_capacity_ml, 
            'is_thermal', v_name ~ '(T[EÉ]RMIC|ISOTERM|VACUUM)',
            'has_alca', v_name ~ '(AL[CÇ]A|ALCA)',
            'has_canudo', v_name ~ '(CANUDO|STRAW)'
        );

    -- PRIORIDADE 90: COPOS E CANECAS (com boundary manual para COPO)
    ELSIF v_name ~ '((^|[^A-Z])COPO([^A-Z]|$)|CANECA|MUG|TUMBLER|LONG\s*DRINK)' THEN
        v_confidence := 'high';
        
        IF v_name ~ '(CANECA|MUG)' THEN
            v_type := 'CANECA';
            IF v_name ~ '(CER[AÂ]MIC|PORCELANA)' THEN 
                v_material := 'CERÂMICA'; v_target_slug := 'canecas_porcelana';
            ELSIF v_name ~ '(INOX|A[CÇ]O)' THEN 
                v_material := 'INOX'; v_target_slug := 'canecas_inox';
            ELSIF v_name ~ '(VIDRO|GLASS)' THEN 
                v_material := 'VIDRO'; v_target_slug := 'canecas_vidro';
            ELSIF v_name ~ '(PL[AÁ]STIC|POL[IÍ]MERO)' THEN 
                v_material := 'PLÁSTICO'; v_target_slug := 'canecas_plastico';
            ELSIF v_name ~ '(ESMALT)' THEN 
                v_material := 'ESMALTADA'; v_target_slug := 'canecas_esmaltada';
            ELSIF v_name ~ '(ALUM[IÍ]N)' THEN 
                v_material := 'ALUMÍNIO'; v_target_slug := 'canecas_aluminio';
            ELSIF v_name ~ '(ECO\s*FIBRA|FIBRA)' THEN 
                v_material := 'ECO FIBRA'; v_target_slug := 'canecas_plastico_eco_fibra';
            ELSE 
                v_material := 'CERÂMICA'; v_target_slug := 'canecas';
            END IF;
            v_fallback_slug := 'canecas';
            
        ELSIF v_name ~ '(T[EÉ]RMIC|ISOTERM|VACUUM|TUMBLER)' THEN
            v_type := 'COPO_TERMICO';
            v_material := 'INOX';
            v_target_slug := 'copos-inox';
            v_fallback_slug := 'copos';
            
        ELSE
            v_type := 'COPO';
            IF v_name ~ '(VIDRO|GLASS)' THEN 
                v_material := 'VIDRO'; v_target_slug := 'copos-vidro';
            ELSIF v_name ~ '(INOX|A[CÇ]O)' THEN 
                v_material := 'INOX'; v_target_slug := 'copos-inox';
            ELSIF v_name ~ 'LONG\s*DRINK' THEN 
                v_material := 'PLÁSTICO'; v_target_slug := 'copos-plastico-long-drink';
            ELSIF v_name ~ '(BUCKS|CAFE)' THEN 
                v_material := 'PLÁSTICO'; v_target_slug := 'copos-plastico-bucks-cafe';
            ELSIF v_name ~ 'TWISTER' THEN 
                v_material := 'PLÁSTICO'; v_target_slug := 'copos-plastico-twister';
            ELSIF v_name ~ 'ALUM' THEN 
                v_material := 'ALUMÍNIO'; v_target_slug := 'copos-aluminio';
            ELSE 
                v_material := 'PLÁSTICO'; v_target_slug := 'copos-plastico';
            END IF;
            v_fallback_slug := 'copos';
        END IF;
        
        v_attributes := jsonb_build_object(
            'capacity_ml', v_capacity_ml, 
            'is_thermal', v_name ~ '(T[EÉ]RMIC|ISOTERM|VACUUM)',
            'has_tampa', v_name ~ '(TAMPA|LID)',
            'has_canudo', v_name ~ '(CANUDO|STRAW)'
        );

    -- PRIORIDADE 85: MOCHILAS E BOLSAS (com boundary manual para BOLSA)
    ELSIF v_name ~ '(MOCHILA|(^|[^A-Z])BOLSA([^A-Z]|$)|SACOLA|NECESSAIRE|ECOBAG|POCHETE|ESTOJO)' THEN
        v_confidence := 'high';
        
        IF v_name ~ 'MOCHILA' THEN
            v_type := 'MOCHILA'; 
            v_target_slug := 'mochilas'; 
            v_fallback_slug := 'papelaria_e_escritorio';
            IF v_name ~ '(NOTEBOOK|PC|LAPTOP)' THEN
                v_attributes := jsonb_set(v_attributes, '{has_notebook_pocket}', 'true');
            END IF;
            
        ELSIF v_name ~ '(SACOLA|ECOBAG)' THEN
            v_type := 'SACOLA'; 
            v_target_slug := 'ecologia'; 
            v_fallback_slug := 'ecologia';
            IF v_name ~ 'ALGOD' THEN v_material := 'ALGODÃO';
            ELSIF v_name ~ 'TNT' THEN v_material := 'TNT';
            ELSIF v_name ~ 'JUTA' THEN v_material := 'JUTA';
            END IF;
            
        ELSIF v_name ~ 'NECESSAIRE' THEN
            v_type := 'NECESSAIRE'; 
            v_target_slug := 'saude_beleza_bem_estar'; 
            v_fallback_slug := 'saude_beleza_bem_estar';
            
        ELSIF v_name ~ 'POCHETE' THEN
            v_type := 'POCHETE'; 
            v_target_slug := 'esportes_aventura_lazer_viagem'; 
            v_fallback_slug := 'esportes_aventura_lazer_viagem';
            
        ELSIF v_name ~ 'ESTOJO' THEN
            v_type := 'ESTOJO'; 
            v_target_slug := 'papelaria_e_escritorio'; 
            v_fallback_slug := 'papelaria_e_escritorio';
            
        ELSE
            v_type := 'BOLSA'; 
            v_target_slug := 'esportes_aventura_lazer_viagem'; 
            v_fallback_slug := 'esportes_aventura_lazer_viagem';
            IF v_name ~ '(T[EÉ]RMIC|COOLER)' THEN v_material := 'TÉRMICA'; END IF;
        END IF;
        
        v_attributes := v_attributes || jsonb_build_object(
            'is_thermal', v_name ~ '(T[EÉ]RMIC|COOLER)',
            'is_waterproof', v_name ~ '(PROVA\s*D.?AGUA|IMPERME[AÁ]VEL)'
        );

    -- PRIORIDADE 80: GUARDA-CHUVA
    ELSIF v_name ~ '(GUARDA[\s\-]?CHUVA|GUARDACHUVA|SOMBRINHA|UMBRELLA)' THEN
        v_type := 'GUARDA_CHUVA'; v_confidence := 'high';
        v_target_slug := 'guarda-chuva'; v_fallback_slug := 'guarda-chuva';
        v_attributes := jsonb_build_object(
            'is_automatic', v_name ~ 'AUTOM',
            'is_inverted', v_name ~ 'INVERTID',
            'is_compact', v_name ~ '(COMPACTO|MINI|DOBR)'
        );

    -- PRIORIDADE 75: PAPELARIA
    ELSIF v_name ~ '(CADERNO|CADERNETA|BLOCO|AGENDA|PLANNER|CALEND[AÁ]RIO|CALCULADORA)' THEN
        v_confidence := 'high';
        
        IF v_name ~ '(AGENDA|PLANNER)' THEN
            v_type := 'AGENDA'; v_target_slug := 'agendas';
        ELSIF v_name ~ '(CADERNO|CADERNETA|BLOCO)' THEN
            v_type := 'CADERNO'; v_target_slug := 'blocos';
        ELSIF v_name ~ 'CALEND' THEN
            v_type := 'CALENDARIO'; v_target_slug := 'calendarios';
        ELSIF v_name ~ 'CALCULADORA' THEN
            v_type := 'CALCULADORA'; v_target_slug := 'calculadoras';
        END IF;
        v_fallback_slug := 'papelaria_e_escritorio';
        
        v_attributes := jsonb_build_object(
            'has_capa_dura', v_name ~ '(CAPA[\s\-]?DURA|HARD)',
            'is_ecologico', v_name ~ '(ECOL|RECICL|KRAFT)',
            'has_espiral', v_name ~ '(ESPIRAL|WIRE)'
        );

    -- PRIORIDADE 70: CHAVEIROS (boundary manual)
    ELSIF v_name ~ '(^|[^A-Z])CHAVEIRO([^A-Z]|$)' THEN
        v_type := 'CHAVEIRO'; v_confidence := 'high';
        v_target_slug := 'chaveiros'; v_fallback_slug := 'chaveiros';
        
        IF v_name ~ '(METAL|INOX|ALUM)' THEN v_material := 'METAL';
        ELSIF v_name ~ '(COURO|LEATHER)' THEN v_material := 'COURO';
        ELSIF v_name ~ '(ECOL|MADEIRA|BAMBU)' THEN v_material := 'ECOLÓGICO';
        ELSIF v_name ~ 'ACRIL' THEN v_material := 'ACRÍLICO';
        END IF;
        
        v_attributes := jsonb_build_object(
            'has_abridor', v_name ~ 'ABRIDOR', 
            'has_lanterna', v_name ~ '(LANTERNA|LED)'
        );

    -- PRIORIDADE 60: KITS (boundary manual)
    ELSIF v_name ~ '(^|[^A-Z])KIT([^A-Z]|$)' THEN
        v_type := 'KIT'; v_confidence := 'high';
        
        IF v_name ~ '(CHURRASCO|BBQ|BARBECUE)' THEN
            v_type := 'KIT_CHURRASCO'; v_target_slug := 'kit_churrasco';
        ELSIF v_name ~ '(CAF[EÉ]|COFFEE)' THEN
            v_type := 'KIT_CAFE'; v_target_slug := 'kit_cafe';
        ELSIF v_name ~ '(CAIPIRINHA|DRINK|BAR|BEBIDA)' THEN
            v_type := 'KIT_BAR'; v_target_slug := 'kit_caipirinha';
        ELSIF v_name ~ 'FONDUE' THEN
            v_type := 'KIT_FONDUE'; v_target_slug := 'kit_fondue';
        ELSIF v_name ~ 'GOURMET' THEN
            v_type := 'KIT_GOURMET'; v_target_slug := 'kit_gourmet';
        ELSIF v_name ~ 'CHIMAR' THEN
            v_type := 'KIT_CHIMARRAO'; v_target_slug := 'kit_chimarrao';
        ELSIF v_name ~ '(ESCRIT|EXECUTIV)' THEN
            v_type := 'KIT_ESCRITORIO'; v_target_slug := 'kit_executivo';
        ELSIF v_name ~ '(MANICURE|PEDICURE|UNHA)' THEN
            v_type := 'KIT_MANICURE'; 
            v_target_slug := 'kit_manicure';
            v_fallback_slug := 'saude_beleza_bem_estar';
        ELSIF v_name ~ '(HIGIENE|BANHO)' THEN
            v_type := 'KIT_HIGIENE'; v_target_slug := 'saude_beleza_bem_estar';
        ELSIF v_name ~ '(FERRAMENT|TOOL)' THEN
            v_type := 'KIT_FERRAMENTAS'; v_target_slug := 'Ferramentas e Utilidades';
        ELSE
            v_target_slug := 'bar_e_cozinha'; v_confidence := 'medium';
        END IF;
        v_fallback_slug := COALESCE(v_fallback_slug, 'bar_e_cozinha');

    -- PRIORIDADE 55: FERRAMENTAS
    ELSIF v_name ~ '(LANTERNA|CANIVETE|MULTIFERRAMENTA|FITA\s*M[EÉ]TRICA|CHAVE\s*(FENDA|PHILIPS))' THEN
        v_type := 'FERRAMENTA'; v_confidence := 'high';
        v_target_slug := 'Ferramentas e Utilidades'; 
        v_fallback_slug := 'Ferramentas e Utilidades';
        
        IF v_name ~ 'LANTERNA' THEN v_type := 'LANTERNA';
        ELSIF v_name ~ '(CANIVETE|MULTIFERRAMENTA)' THEN v_type := 'CANIVETE';
        ELSIF v_name ~ 'FITA' THEN v_type := 'FITA_METRICA';
        END IF;

    -- PRIORIDADE 50: VESTUÁRIO
    ELSIF v_name ~ '(CAMISETA|CAMISA|POLO|BON[EÉ]|CHAP[EÉ]U|VISEIRA|TOCA|GORRO)' THEN
        v_type := 'VESTUARIO'; v_confidence := 'high';
        v_target_slug := 'roupas_calcados_acessorios'; 
        v_fallback_slug := 'roupas_calcados_acessorios';
        
        IF v_name ~ '(CAMISETA|T[\s\-]?SHIRT)' THEN v_type := 'CAMISETA';
        ELSIF v_name ~ '(CAMISA|POLO)' THEN v_type := 'CAMISA';
        ELSIF v_name ~ 'BON[EÉ]' THEN v_type := 'BONE';
        ELSIF v_name ~ 'CHAP[EÉ]U' THEN v_type := 'CHAPEU';
        ELSIF v_name ~ 'VISEIRA' THEN v_type := 'VISEIRA';
        END IF;

    -- PRIORIDADE 48: PORTA COMPRIMIDO
    -- Categoria: 9d6f5d5a-79b6-477e-9951-7e078d720d23
    -- Parent: Saúde | Beleza | Bem Estar (e27d77ff-4acd-4daf-ab7d-2c4f769950df)
    ELSIF v_name ~ 'PORTA[\s\-]?(COMPRIMIDO|P[IÍ]LULA|REM[EÉ]DIO|MEDICAMENTO)' THEN
        v_type := 'PORTA_COMPRIMIDO'; v_confidence := 'high';
        v_target_slug := 'porta-comprimido'; 
        v_fallback_slug := 'saude_beleza_bem_estar';

    -- PRIORIDADE 47: PENTES E ESCOVAS
    -- Categoria: a49b9e19-9fcb-40ca-a281-5a15cba9a4b5
    -- Parent: Saúde | Beleza | Bem Estar (e27d77ff-4acd-4daf-ab7d-2c4f769950df)
    ELSIF v_name ~ '(PENTE|ESCOVA\s*(DE\s*)?(CABELO|HAIR)?|RASQUEAD)' AND NOT v_name ~ 'ESCOVA\s*(DE\s*)?(DENTE|DENTAL)' THEN
        v_type := 'PENTE_ESCOVA'; v_confidence := 'high';
        v_target_slug := 'pentes-e-escovas'; 
        v_fallback_slug := 'saude_beleza_bem_estar';
        
        IF v_name ~ 'PENTE' THEN v_type := 'PENTE';
        ELSIF v_name ~ 'ESCOVA' THEN v_type := 'ESCOVA_CABELO';
        ELSIF v_name ~ 'RASQUEAD' THEN v_type := 'RASQUEADEIRA';
        END IF;
        
        v_attributes := jsonb_build_object(
            'is_dobravel', v_name ~ '(DOBR|VIAGEM|POCKET)',
            'has_espelho', v_name ~ 'ESPELHO'
        );

    -- PRIORIDADE 45: TOALHAS
    ELSIF v_name ~ '(^|[^A-Z])TOALHA([^A-Z]|$)' THEN
        v_type := 'TOALHA'; v_confidence := 'high';
        v_target_slug := 'esportes_aventura_lazer_viagem'; 
        v_fallback_slug := 'esportes_aventura_lazer_viagem';

    -- PRIORIDADE 40: RELÓGIOS
    ELSIF v_name ~ 'REL[OÓ]GIO' THEN
        v_type := 'RELOGIO'; v_confidence := 'high';
        v_target_slug := 'utensilios_decoracao'; 
        v_fallback_slug := 'utensilios_decoracao';

    -- PRIORIDADE 35: ÓCULOS
    ELSIF v_name ~ '[OÓ]CULOS' THEN
        v_type := 'OCULOS'; v_confidence := 'high';
        v_target_slug := 'roupas_calcados_acessorios'; 
        v_fallback_slug := 'roupas_calcados_acessorios';

    -- PRIORIDADE 30: PORTA-OBJETOS (boundary manual)
    ELSIF v_name ~ '(^|[^A-Z])PORTA[\s\-]?' THEN
        v_type := 'PORTA_OBJETOS'; v_confidence := 'high';
        
        IF v_name ~ 'PORTA[\s\-]?(CART[AÃ]O|CART[OÕ]ES|CARD)' THEN
            v_target_slug := 'roupas_calcados_acessorios';
        ELSIF v_name ~ 'PORTA[\s\-]?(CANETA|LAPIS)' THEN
            v_target_slug := 'porta_caneta'; v_fallback_slug := 'papelaria_e_escritorio';
        ELSIF v_name ~ 'PORTA[\s\-]?CRACH[AÁ]' THEN
            v_target_slug := 'porta_cracha_roller_clip'; v_fallback_slug := 'identificacao';
        ELSIF v_name ~ 'PORTA[\s\-]?(RETRATO|FOTO)' THEN
            v_target_slug := 'utensilios_decoracao';
        ELSIF v_name ~ 'PORTA[\s\-]?(CHAVE|CELULAR|MOEDA)' THEN
            v_target_slug := 'roupas_calcados_acessorios';
        ELSE
            v_target_slug := 'utensilios_decoracao';
        END IF;
        v_fallback_slug := COALESCE(v_fallback_slug, 'utensilios_decoracao');

    -- PRIORIDADE 25: JOGOS
    ELSIF v_name ~ '(JOGO|BARALHO|DOMIN[OÓ]|XADREZ|DAMA|BOLA\s*(ANTI)?[\s\-]?STRESS)' THEN
        v_type := 'JOGO'; v_confidence := 'high';
        v_target_slug := 'jogos_e_brinquedos'; 
        v_fallback_slug := 'jogos_e_brinquedos';

    -- PRIORIDADE 20: CORDÃO DE CRACHÁ
    ELSIF v_name ~ '(CORD[AÃ]O|LANYARD)' OR v_name ~ '(^|[^A-Z])CRACH[AÁ]([^A-Z]|$)' THEN
        v_type := 'CORDAO_CRACHA'; v_confidence := 'high';
        v_target_slug := 'cordao-de-cracha'; 
        v_fallback_slug := 'cordao-de-cracha';

    -- PRIORIDADE 15: ARTIGOS REGIONAIS
    ELSIF v_name ~ '(CUIA|BOMBA|CHIMAR|TERERE|MATEIRA|PORONGO)' THEN
        v_type := 'ARTIGO_REGIONAL'; v_confidence := 'high';
        
        IF v_name ~ '(CUIA.*CHIMAR|CHIMAR.*CUIA|CUIA.*PORONGO)' THEN
            v_target_slug := 'cuia_chimarrao';
        ELSIF v_name ~ '(CUIA.*TERERE|TERERE.*CUIA)' THEN
            v_target_slug := 'cuia_terere';
        ELSIF v_name ~ 'BOMBA' THEN
            v_target_slug := 'bomba_chimarrao';
        ELSIF v_name ~ 'MATEIRA' THEN
            v_target_slug := 'mateiras';
        ELSE
            v_target_slug := 'artigos_regionais';
        END IF;
        v_fallback_slug := 'artigos_regionais';

    -- FALLBACK
    ELSE
        v_type := 'INDEFINIDO'; 
        v_target_slug := NULL; 
        v_fallback_slug := NULL; 
        v_confidence := 'low';
    END IF;

    -- ========================================================================
    -- ETAPA 4: BUSCA NO BANCO
    -- ========================================================================
    IF v_target_slug IS NOT NULL THEN
        SELECT c.id, c.name, c.slug, c.level, COALESCE(c.full_path_readable, c.name)
        INTO v_cat_id, v_cat_name, v_cat_slug, v_cat_level, v_cat_path
        FROM categories c
        WHERE c.slug = v_target_slug 
          AND c.is_active = true 
          AND c.organization_id = v_org_id
        LIMIT 1;
    END IF;
    
    -- Fallback se não encontrou
    IF v_cat_id IS NULL AND v_fallback_slug IS NOT NULL AND v_fallback_slug != v_target_slug THEN
        SELECT c.id, c.name, c.slug, c.level, COALESCE(c.full_path_readable, c.name)
        INTO v_cat_id, v_cat_name, v_cat_slug, v_cat_level, v_cat_path
        FROM categories c
        WHERE c.slug = v_fallback_slug 
          AND c.is_active = true 
          AND c.organization_id = v_org_id
        LIMIT 1;
        
        IF v_cat_id IS NOT NULL AND v_confidence = 'high' THEN 
            v_confidence := 'medium'; 
        END IF;
    END IF;

    -- ========================================================================
    -- ETAPA 5: RETORNO
    -- ========================================================================
    RETURN QUERY SELECT 
        v_cat_id, v_cat_name, v_cat_slug, v_cat_level, v_cat_path,
        v_confidence, v_type, v_material, v_attributes;
END;
$function$
