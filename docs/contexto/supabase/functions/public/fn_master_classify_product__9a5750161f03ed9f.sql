CREATE OR REPLACE FUNCTION public.fn_master_classify_product(p_name text, p_product_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_result JSONB;
    v_name_lower TEXT;
    v_category_id UUID;
    v_category_slug TEXT;
    v_detected_type TEXT := 'NAO_CLASSIFICADO';
    v_material TEXT;
    v_attributes JSONB;
BEGIN
    -- Normalizar nome
    p_name := COALESCE(TRIM(p_name), '');
    v_name_lower := LOWER(unaccent(p_name));
    
    IF p_name = '' THEN
        RETURN jsonb_build_object(
            'detected_type', 'NAO_CLASSIFICADO',
            'category_id', NULL,
            'category_slug', NULL,
            'classified_at', NOW()
        );
    END IF;

    -- ========================================
    -- DETECÇÃO POR PALAVRAS-CHAVE NO NOME
    -- Ordem de prioridade (mais específico primeiro)
    -- ========================================
    
    -- 1. KITS (verificar primeiro - mais específicos)
    IF v_name_lower ~ '(kit|conjunto).*(churrasco|churrasqueira|espeto)' OR
       v_name_lower ~ '(churrasco|churrasqueira).*(kit|conjunto)' THEN
        SELECT * INTO v_result FROM classify_kit_churrasco(p_name);
        v_detected_type := 'KIT_CHURRASCO';
        
    ELSIF v_name_lower ~ '(kit|conjunto).*(vinho|saca.?rolha|abridor)' OR
          v_name_lower ~ '(vinho).*(kit|conjunto)' THEN
        SELECT * INTO v_result FROM classify_kit_vinho(p_name);
        v_detected_type := 'KIT_VINHO';
        
    ELSIF v_name_lower ~ '(kit|conjunto|tabua).*(queijo|faca|garfo)' OR
          v_name_lower ~ '(queijo).*(kit|conjunto)' THEN
        SELECT * INTO v_result FROM classify_kit_queijo(p_name);
        v_detected_type := 'KIT_QUEIJO';
        
    ELSIF v_name_lower ~ '(kit|conjunto).*(banho|spa|higiene|sabonete|toalha)' OR
          v_name_lower ~ '(banho|spa).*(kit|conjunto)' THEN
        SELECT * INTO v_result FROM classify_kit_banho(p_name);
        v_detected_type := 'KIT_BANHO';

    -- 2. CANETAS
    ELSIF v_name_lower ~ '(caneta|esferograf|roller|marca.?texto|lapiseira|lapis)' THEN
        SELECT * INTO v_result FROM classify_pen(p_name);
        IF (v_result->>'is_pen')::BOOLEAN = true THEN
            v_detected_type := 'CANETA';
        ELSE
            v_result := NULL;
        END IF;

    -- 3. SQUEEZE / GARRAFAS (incluindo garrafa térmica)
    ELSIF v_name_lower ~ '(squeeze|garrafa|garrafinha|cantil|caramanhola)' THEN
        SELECT * INTO v_result FROM classify_squeeze(p_name);
        v_detected_type := 'SQUEEZE';

    -- 4. COPOS
    ELSIF v_name_lower ~ '(copo|caneca|tumbler)' AND NOT v_name_lower ~ '(garrafa|squeeze)' THEN
        SELECT * INTO v_result FROM classify_copo(p_name);
        v_detected_type := 'COPO';

    -- 5. CANECAS (específico)
    ELSIF v_name_lower ~ '(caneca|xicara|xicar)' THEN
        SELECT * INTO v_result FROM classify_caneca(p_name);
        v_detected_type := 'CANECA';

    -- 6. MOCHILAS
    ELSIF v_name_lower ~ '(mochila|backpack)' THEN
        SELECT * INTO v_result FROM classify_mochila(p_name);
        v_detected_type := 'MOCHILA';

    -- 7. BOLSAS TÉRMICAS
    ELSIF v_name_lower ~ '(bolsa|sacola|bag).*(termic|cooler|isot)' OR
          v_name_lower ~ '(termic|cooler|isot).*(bolsa|sacola|bag)' THEN
        SELECT * INTO v_result FROM classify_bolsa_termica(p_name);
        v_detected_type := 'BOLSA_TERMICA';

    -- 8. SACOLAS
    ELSIF v_name_lower ~ '(sacola|ecobag|eco.?bag|tote|shopper)' THEN
        SELECT * INTO v_result FROM classify_sacola(p_name);
        v_detected_type := 'SACOLA';

    -- 9. NECESSAIRES
    ELSIF v_name_lower ~ '(necessaire|estojo|pochete|porta.?cosmetico)' AND
          NOT v_name_lower ~ '(caneta|lapis)' THEN
        SELECT * INTO v_result FROM classify_necessaire(p_name);
        v_detected_type := 'NECESSAIRE';

    -- 10. PASTAS
    ELSIF v_name_lower ~ '(pasta|portfolio|port.?folio|briefcase|maleta)' AND
          NOT v_name_lower ~ '(dente|dental)' THEN
        SELECT * INTO v_result FROM classify_pasta(p_name);
        v_detected_type := 'PASTA';

    -- 11. CHAVEIROS
    ELSIF v_name_lower ~ '(chaveiro|porta.?chave)' THEN
        SELECT * INTO v_result FROM classify_chaveiro(p_name);
        v_detected_type := 'CHAVEIRO';

    -- 12. LANTERNAS
    ELSIF v_name_lower ~ '(lanterna|flashlight|led.?light)' AND
          NOT v_name_lower ~ '(chaveiro|caneta)' THEN
        SELECT * INTO v_result FROM classify_lanterna(p_name);
        v_detected_type := 'LANTERNA';

    -- 13. FONES DE OUVIDO
    ELSIF v_name_lower ~ '(fone|headphone|headset|earphone|earbud|auricular)' THEN
        SELECT * INTO v_result FROM classify_fone_ouvido(p_name);
        v_detected_type := 'FONE_OUVIDO';

    -- 14. PENDRIVES
    ELSIF v_name_lower ~ '(pendrive|pen.?drive|flash.?drive|usb.?drive|memoria.?usb)' OR
          v_name_lower ~ '(\d+\s*gb|\d+\s*mb)' THEN
        SELECT * INTO v_result FROM classify_pendrive(p_name);
        v_detected_type := 'PENDRIVE';

    -- 15. RELÓGIOS
    ELSIF v_name_lower ~ '(relogio|watch|smartwatch|smart.?watch)' THEN
        SELECT * INTO v_result FROM classify_relogio(p_name);
        v_detected_type := 'RELOGIO';

    -- 16. ÓCULOS
    ELSIF v_name_lower ~ '(oculos|oculus|sunglasses|lentes)' THEN
        SELECT * INTO v_result FROM classify_oculos(p_name);
        v_detected_type := 'OCULOS';

    -- 17. TAÇAS
    ELSIF v_name_lower ~ '(taca|calice|champagne|espumante|vinho)' AND
          NOT v_name_lower ~ '(kit|conjunto|abridor)' THEN
        SELECT * INTO v_result FROM classify_taca(p_name);
        v_detected_type := 'TACA';

    -- 18. ESPELHOS
    ELSIF v_name_lower ~ '(espelho|mirror)' THEN
        SELECT * INTO v_result FROM classify_espelho(p_name);
        v_detected_type := 'ESPELHO';

    -- 19. RÉGUAS
    ELSIF v_name_lower ~ '(regua|ruler|escala)' THEN
        SELECT * INTO v_result FROM classify_regua(p_name);
        v_detected_type := 'REGUA';

    -- 20. TÁBUAS
    ELSIF v_name_lower ~ '(tabua|taboas|cutting.?board)' AND
          NOT v_name_lower ~ '(kit|conjunto|queijo)' THEN
        SELECT * INTO v_result FROM classify_tabua(p_name);
        v_detected_type := 'TABUA';

    -- 21. BALDES DE GELO
    ELSIF v_name_lower ~ '(balde|ice.?bucket|champanheira)' AND
          v_name_lower ~ '(gelo|ice|champanhe|bebida)' THEN
        SELECT * INTO v_result FROM classify_balde_gelo(p_name);
        v_detected_type := 'BALDE_GELO';

    -- 23. MATERIAL GRÁFICO
    ELSIF v_name_lower ~ '(banner|folder|flyer|panfleto|roll.?up|rollup|etiqueta.?(grafica|adesiva)|cartao.?de.?visita|material.?grafico|adesivo.?vinil|display.?personaliz|totem)' THEN
        SELECT c.id, c.slug INTO v_category_id, v_category_slug
        FROM categories c
        WHERE c.slug = 'material_grafico'
          AND c.organization_id = '5db5aee1-064b-4ef4-9193-345dcd8274ea'
        LIMIT 1;
        IF v_category_id IS NOT NULL THEN
            v_result := jsonb_build_object(
                'category_id', v_category_id::text,
                'category_slug', v_category_slug,
                'material', 'Impresso',
                'attributes', '{}'::jsonb
            );
        END IF;
        v_detected_type := 'MATERIAL_GRAFICO';

    -- 22. MASSAGEADORES
    ELSIF v_name_lower ~ '(massageador|massager|massagem)' THEN
        SELECT * INTO v_result FROM classify_massageador(p_name);
        v_detected_type := 'MASSAGEADOR';

    END IF;

    -- ========================================
    -- RETORNAR RESULTADO
    -- ========================================
    
    IF v_result IS NOT NULL AND v_result->>'category_id' IS NOT NULL THEN
        RETURN jsonb_build_object(
            'detected_type', v_detected_type,
            'category_id', v_result->>'category_id',
            'category_slug', v_result->>'category_slug',
            'material', v_result->>'material',
            'attributes', v_result->'attributes',
            'classified_at', NOW()
        );
    END IF;
    
    -- Nenhuma classificação encontrada
    RETURN jsonb_build_object(
        'detected_type', 'NAO_CLASSIFICADO',
        'category_id', NULL,
        'category_slug', NULL,
        'classified_at', NOW()
    );
END;
$function$
