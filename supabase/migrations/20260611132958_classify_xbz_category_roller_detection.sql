
-- Abordagem direta: recriar função com ROLLER detection incluído
-- Preserva toda lógica existente, insere ROLLER antes de METAL

-- Primeiro DROP para resolver conflito de assinatura/tipo de retorno
DROP FUNCTION IF EXISTS public.classify_xbz_category(text);

CREATE OR REPLACE FUNCTION public.classify_xbz_category(p_product_name text)
RETURNS TABLE(category_id uuid, category_name text, category_slug text, category_level integer, confidence text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_name_upper TEXT;
    v_org_id UUID := '5db5aee1-064b-4ef4-9193-345dcd8274ea';
BEGIN
    v_name_upper := UPPER(TRIM(p_product_name));

    -- PRIORIDADE 100: TECNOLOGIA
    IF v_name_upper ~* '(POWER.?BANK|CARREGADOR.?PORT|BATERIA.?EXTERNA|POWERBANK|BATERIA.?PORT)' THEN
        RETURN QUERY SELECT c.id, c.name, c.slug, c.level, 'high'::TEXT FROM categories c
        WHERE c.organization_id = v_org_id AND c.slug = 'carregador-portatil-powerbank' LIMIT 1;
        IF FOUND THEN RETURN; END IF;
        RETURN QUERY SELECT c.id, c.name, c.slug, c.level, 'medium'::TEXT FROM categories c
        WHERE c.organization_id = v_org_id AND c.slug = 'tecnologia-eletronicos' LIMIT 1;
        IF FOUND THEN RETURN; END IF;
    END IF;

    IF v_name_upper ~* '(FONE|AUSCULTADOR|HEADPHONE|EARPHONE|EARBUDS|HEADSET)' THEN
        RETURN QUERY SELECT c.id, c.name, c.slug, c.level, 'high'::TEXT FROM categories c
        WHERE c.organization_id = v_org_id AND c.slug = 'fone-de-ouvido' LIMIT 1;
        IF FOUND THEN RETURN; END IF;
        RETURN QUERY SELECT c.id, c.name, c.slug, c.level, 'medium'::TEXT FROM categories c
        WHERE c.organization_id = v_org_id AND c.slug = 'tecnologia-eletronicos' LIMIT 1;
        IF FOUND THEN RETURN; END IF;
    END IF;

    IF v_name_upper ~* '(PEN.?DRIVE|PENDRIVE|USB.?FLASH|FLASH.?DRIVE)' THEN
        RETURN QUERY SELECT c.id, c.name, c.slug, c.level, 'high'::TEXT FROM categories c
        WHERE c.organization_id = v_org_id AND c.slug = 'pen-drive' LIMIT 1;
        IF FOUND THEN RETURN; END IF;
        RETURN QUERY SELECT c.id, c.name, c.slug, c.level, 'medium'::TEXT FROM categories c
        WHERE c.organization_id = v_org_id AND c.slug = 'tecnologia-eletronicos' LIMIT 1;
        IF FOUND THEN RETURN; END IF;
    END IF;

    -- PRIORIDADE 95: CANETAS (ordem: Semi Metal → Roller → Metal → Eco → Plástico → Fallback)
    IF v_name_upper ~* '(CANETA|ESFERO|ROLLER|LAPISEIRA|MARCA.?TEXTO)' THEN

        -- 1. SEMI METAL (vem primeiro)
        IF v_name_upper ~* '(SEMI.?METAL|SEMIMETAL)' THEN
            RETURN QUERY SELECT c.id, c.name, c.slug, c.level, 'high'::TEXT FROM categories c
            WHERE c.organization_id = v_org_id AND c.id = '069cdd2f-1a52-43ff-8ba0-bdcda8ac13c7' LIMIT 1;
            IF FOUND THEN RETURN; END IF;
        END IF;

        -- 1.5. ROLLER / ROLLERBALL (sub-categoria de Metal — detecta antes do metal genérico)
        -- Exceção: roller eco (bambu, cortiça, papel) fica na categoria eco
        IF v_name_upper ~* '(ROLLER|ROLLERBALL)'
           AND NOT v_name_upper ~* '(BAMBU|BAMBOO|CORK|CORTI|PAPEL|RECICLAD|ECO)' THEN
            RETURN QUERY SELECT c.id, c.name, c.slug, c.level, 'high'::TEXT FROM categories c
            WHERE c.organization_id = v_org_id
              AND c.id = 'e1f58712-64f2-4574-af58-50595b0d258b'::uuid LIMIT 1;
            IF FOUND THEN RETURN; END IF;
        END IF;

        -- 2. METAL
        IF v_name_upper ~* '(METAL|METALIC|INOX|A[CÇ]O|ALUM[IÍ]NIO|BRONZE|COBRE|LATAO|LAT[ÃA]O)' THEN
            RETURN QUERY SELECT c.id, c.name, c.slug, c.level, 'high'::TEXT FROM categories c
            WHERE c.organization_id = v_org_id AND c.id = 'cad28bda-dc4b-4938-b88b-8653ee4e6c1f' LIMIT 1;
            IF FOUND THEN RETURN; END IF;
        END IF;

        -- 3. ECOLÓGICA
        IF v_name_upper ~* '(ECOL[OÓ]GIC|BAMBU|BAMBOO|PAPEL|RECICLAD|KRAFT|CORTI[CÇ]A|MADEIRA|FIBRA)' THEN
            RETURN QUERY SELECT c.id, c.name, c.slug, c.level, 'high'::TEXT FROM categories c
            WHERE c.organization_id = v_org_id AND c.id = 'a1b2c3d4-e5f6-4789-abcd-111111111111' LIMIT 1;
            IF FOUND THEN RETURN; END IF;
        END IF;

        -- 4. PLÁSTICO
        IF v_name_upper ~* '(PL[AÁ]STIC|ABS|ACRILICO|ACR[IÍ]LICO|POLIPROPILENO|PP\y|PS\y|PET\y)' THEN
            RETURN QUERY SELECT c.id, c.name, c.slug, c.level, 'high'::TEXT FROM categories c
            WHERE c.organization_id = v_org_id AND c.id = 'f284e79d-f0df-475a-bd75-e1da970f3718' LIMIT 1;
            IF FOUND THEN RETURN; END IF;
        END IF;

        -- 5. FALLBACK: Canetas L2
        RETURN QUERY SELECT c.id, c.name, c.slug, c.level, 'medium'::TEXT FROM categories c
        WHERE c.organization_id = v_org_id AND c.id = 'f11f091d-abfa-4019-89a6-8a1645cc342c' LIMIT 1;
        IF FOUND THEN RETURN; END IF;
    END IF;

    -- DEMAIS CATEGORIAS (preservadas)
    IF v_name_upper ~* '(GUARDA.?CHUVA|SOMBRINHA|UMBRELLA)' THEN
        RETURN QUERY SELECT c.id, c.name, c.slug, c.level, 'high'::TEXT FROM categories c
        WHERE c.organization_id = v_org_id AND (c.slug ILIKE '%guarda%chuva%' OR c.name ILIKE '%guarda%chuva%')
        ORDER BY c.level DESC LIMIT 1; IF FOUND THEN RETURN; END IF;
    END IF;

    IF v_name_upper ~* '\mSQUEEZE\M' THEN
        RETURN QUERY SELECT c.id, c.name, c.slug, c.level, 'high'::TEXT FROM categories c
        WHERE c.organization_id = v_org_id AND (c.slug ILIKE '%squeeze%' OR c.name ILIKE '%squeeze%')
        ORDER BY c.level DESC LIMIT 1; IF FOUND THEN RETURN; END IF;
    END IF;

    IF v_name_upper ~* '(NECESSAIRE|ESTOJO|NÉCESSAIRE)' THEN
        RETURN QUERY SELECT c.id, c.name, c.slug, c.level, 'high'::TEXT FROM categories c
        WHERE c.organization_id = v_org_id
          AND (c.slug ILIKE '%necessaire%' OR c.name ILIKE '%necessaire%'
               OR c.slug ILIKE '%cosmetico%' OR c.name ILIKE '%cosmético%')
        ORDER BY c.level DESC LIMIT 1; IF FOUND THEN RETURN; END IF;
    END IF;

    IF v_name_upper ~* '(MOCHILA|BOLSA|PASTA|MALETA)' THEN
        IF v_name_upper ~* '(NOTEBOOK|PC|TABLET|LAPTOP)' THEN
            RETURN QUERY SELECT c.id, c.name, c.slug, c.level, 'high'::TEXT FROM categories c
            WHERE c.organization_id = v_org_id
              AND (c.slug ILIKE '%notebook%' OR c.name ILIKE '%notebook%'
                   OR c.name ILIKE '%pc%' OR c.name ILIKE '%tablet%') AND c.level >= 1
            ORDER BY c.level DESC LIMIT 1; IF FOUND THEN RETURN; END IF;
        END IF;
        RETURN QUERY SELECT c.id, c.name, c.slug, c.level, 'medium'::TEXT FROM categories c
        WHERE c.organization_id = v_org_id AND (c.slug ILIKE '%mochila%' OR c.name ILIKE '%mochila%')
        ORDER BY c.level DESC LIMIT 1; IF FOUND THEN RETURN; END IF;
    END IF;

    IF v_name_upper ~* 'GARRAFA' AND v_name_upper ~* 'T[EÉ]RMIC' THEN
        RETURN QUERY SELECT c.id, c.name, c.slug, c.level, 'high'::TEXT FROM categories c
        WHERE c.organization_id = v_org_id
          AND (c.slug ILIKE '%garrafa%termica%' OR c.slug ILIKE '%isotermica%'
               OR c.name ILIKE '%garrafa%térmica%' OR c.name ILIKE '%isotérmica%')
        ORDER BY c.level DESC LIMIT 1; IF FOUND THEN RETURN; END IF;
    END IF;

    IF v_name_upper ~* '\mGARRAFA\M' THEN
        RETURN QUERY SELECT c.id, c.name, c.slug, c.level, 'high'::TEXT FROM categories c
        WHERE c.organization_id = v_org_id AND (c.slug ILIKE '%garrafa%' OR c.name ILIKE '%garrafa%')
        ORDER BY c.level DESC LIMIT 1; IF FOUND THEN RETURN; END IF;
    END IF;

    IF v_name_upper ~* '(COPO|CANECA|MUG)' THEN
        RETURN QUERY SELECT c.id, c.name, c.slug, c.level, 'high'::TEXT FROM categories c
        WHERE c.organization_id = v_org_id
          AND (c.slug ILIKE '%copo%' OR c.slug ILIKE '%caneca%'
               OR c.name ILIKE '%copo%' OR c.name ILIKE '%caneca%')
        ORDER BY c.level DESC LIMIT 1; IF FOUND THEN RETURN; END IF;
    END IF;

    IF v_name_upper ~* '(CADERNO|CADERNETA|BLOCO|AGENDA)' THEN
        RETURN QUERY SELECT c.id, c.name, c.slug, c.level, 'high'::TEXT FROM categories c
        WHERE c.organization_id = v_org_id
          AND (c.slug ILIKE '%caderno%' OR c.slug ILIKE '%bloco%' OR c.slug ILIKE '%agenda%'
               OR c.name ILIKE '%caderno%' OR c.name ILIKE '%bloco%' OR c.name ILIKE '%agenda%')
        ORDER BY c.level DESC LIMIT 1; IF FOUND THEN RETURN; END IF;
    END IF;

    IF v_name_upper ~* '\mCHAVEIRO\M' THEN
        RETURN QUERY SELECT c.id, c.name, c.slug, c.level, 'high'::TEXT FROM categories c
        WHERE c.organization_id = v_org_id AND (c.slug ILIKE '%chaveiro%' OR c.name ILIKE '%chaveiro%')
        ORDER BY c.level DESC LIMIT 1; IF FOUND THEN RETURN; END IF;
    END IF;

    IF v_name_upper ~* '\mSACOLA\M' THEN
        RETURN QUERY SELECT c.id, c.name, c.slug, c.level, 'high'::TEXT FROM categories c
        WHERE c.organization_id = v_org_id AND (c.slug ILIKE '%sacola%' OR c.name ILIKE '%sacola%')
        ORDER BY c.level DESC LIMIT 1; IF FOUND THEN RETURN; END IF;
    END IF;

    IF v_name_upper ~* '\mKIT\M' AND v_name_upper ~* 'CHURRASCO' THEN
        RETURN QUERY SELECT c.id, c.name, c.slug, c.level, 'medium'::TEXT FROM categories c
        WHERE c.organization_id = v_org_id AND (c.slug ILIKE '%churrasco%' OR c.name ILIKE '%churrasco%')
        ORDER BY c.level DESC LIMIT 1; IF FOUND THEN RETURN; END IF;
    END IF;

    -- FALLBACK FINAL
    RETURN QUERY SELECT NULL::UUID, 'NÃO CLASSIFICADO'::TEXT, NULL::TEXT, NULL::INTEGER, 'none'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.classify_xbz_category(text) IS
'Classificador de categorias por nome. ROLLER detectado como sub-categoria Metal. v2.0 2026-06-11';
;
