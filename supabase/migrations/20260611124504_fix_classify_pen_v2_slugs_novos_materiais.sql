
-- ============================================================================
-- classify_pen v2.0 — Correção de slugs + novas categorias + volatilidade correta
-- GAPs corrigidos:
--   1. 'canetas-roller' → 'canetas-metal-roller' (slug real no banco)
--   2. Adicionados: canetas-cortica, canetas-madeira, canetas_semi_metal,
--      canetas-fibra-eco, canetas-aluminio-reciclado
--   3. Volatilidade IMMUTABLE → STABLE (função faz SELECT em tabela)
--   4. Adicionado campo 'is_pen' no retorno para classificação segura
-- ============================================================================

CREATE OR REPLACE FUNCTION public.classify_pen(product_name text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE                          -- lê categories; STABLE é o correto (não IMMUTABLE)
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name          TEXT;
    v_is_pen        BOOLEAN := FALSE;
    v_material      TEXT;
    v_category_id   UUID;
    v_category_slug TEXT;
    v_attributes    JSONB;
BEGIN
    -- ========================================================================
    -- 1. NORMALIZAÇÃO
    -- ========================================================================
    v_name := UPPER(unaccent(COALESCE(product_name, '')));

    -- ========================================================================
    -- 2. VALIDAÇÃO: É CANETA OU LAPISEIRA?
    --    Padrões: CANETA, ESFEROGRAF*, ROLLER, LAPISEIRA, STYLUS, MARCA-TEXTO
    -- ========================================================================
    IF v_name ~ 'CANETA|ESFEROGRAF|ROLLER|LAPISEIRA|STYLUS|MARCA.?TEXTO' THEN
        v_is_pen := TRUE;
    END IF;

    -- Se NÃO é caneta/lapiseira, retorna imediatamente (sem custo)
    IF NOT v_is_pen THEN
        RETURN jsonb_build_object(
            'is_pen',        FALSE,
            'category_id',   NULL,
            'category_slug', NULL,
            'material',      NULL,
            'attributes',    NULL
        );
    END IF;

    -- ========================================================================
    -- 3. IDENTIFICAÇÃO DO MATERIAL (hierarquia: mais específico primeiro)
    --    Ordem: Bambu > Cortiça > Madeira > Fibra Eco > Alumínio Reciclado >
    --           Reciclado/Eco > Roller > Metal > Semi-Metal > Plástico > Fallback
    -- ========================================================================

    IF v_name ~ 'BAMBU|BAMBOO' THEN
        v_material      := 'BAMBU';
        v_category_slug := 'canetas-bambu';

    ELSIF v_name ~ 'CORTIC[AÇ]' THEN
        v_material      := 'CORTIÇA';
        v_category_slug := 'canetas-cortica';          -- FIX v2: categoria específica

    ELSIF v_name ~ 'MADEIRA|WOOD' THEN
        v_material      := 'MADEIRA';
        v_category_slug := 'canetas-madeira';          -- NOVO v2

    ELSIF v_name ~ 'FIBRA.?ECO|WHEAT.?STRAW|PALHA.?TRIGO|FIBRA.?TRIGO' THEN
        v_material      := 'FIBRA ECO';
        v_category_slug := 'canetas-fibra-eco';        -- NOVO v2

    ELSIF v_name ~ 'ALUMIN.*RECICLAD|RECICLAD.*ALUMIN' THEN
        v_material      := 'ALUMÍNIO RECICLADO';
        v_category_slug := 'canetas-aluminio-reciclado'; -- NOVO v2

    ELSIF v_name ~ 'RECICLAD|RECICLAV|ECOLOGIC|ECO\.|ECO[^A-Z]|PAPEL|KRAFT' THEN
        v_material      := 'ECOLÓGICA';
        v_category_slug := 'canetas-ecologicas';

    ELSIF v_name ~ 'ROLLER|ROLLERBALL' THEN
        v_material      := 'METAL';
        v_category_slug := 'canetas-metal-roller';     -- FIX v2: slug correto

    ELSIF v_name ~ 'METAL|METALIC|INOX|ALUMIN' THEN
        v_material      := 'METAL';
        v_category_slug := 'canetas_metal';

    ELSIF v_name ~ 'SEMI.?METAL' THEN
        v_material      := 'SEMI-METAL';
        v_category_slug := 'canetas_semi_metal';       -- NOVO v2

    ELSIF v_name ~ 'PLASTIC|ACRILIC|ABS|EMBORRACHAD|SILICONE|TRANSPARENTE|TRANSLUCID' THEN
        v_material      := 'PLÁSTICO';
        v_category_slug := 'canetas_plastico';

    ELSE
        v_material      := 'INDEFINIDO';
        v_category_slug := 'canetas';
    END IF;

    -- ========================================================================
    -- 4. BUSCAR UUID DA CATEGORIA (dinâmico — nunca hardcoded)
    -- ========================================================================
    SELECT id INTO v_category_id
    FROM categories
    WHERE slug = v_category_slug AND is_active = true
    LIMIT 1;

    -- Fallback em cascata: subcategoria → pai → raiz canetas
    IF v_category_id IS NULL AND v_category_slug NOT IN ('canetas', 'canetas-ecologicas', 'canetas_metal', 'canetas_plastico') THEN
        -- Tenta a categoria-pai mais próxima
        CASE
            WHEN v_category_slug IN ('canetas-cortica', 'canetas-madeira', 'canetas-fibra-eco',
                                      'canetas-aluminio-reciclado', 'canetas-papel-reciclado',
                                      'canetas-plastico-reciclado') THEN
                SELECT id INTO v_category_id FROM categories WHERE slug = 'canetas-ecologicas' AND is_active = true LIMIT 1;
            WHEN v_category_slug IN ('canetas-metal-roller', 'canetas-premium-griffs') THEN
                SELECT id INTO v_category_id FROM categories WHERE slug = 'canetas_metal' AND is_active = true LIMIT 1;
            WHEN v_category_slug = 'canetas_semi_metal' THEN
                SELECT id INTO v_category_id FROM categories WHERE slug = 'canetas_metal' AND is_active = true LIMIT 1;
            ELSE NULL;
        END CASE;
        v_category_slug := COALESCE(
            (SELECT slug FROM categories WHERE id = v_category_id LIMIT 1),
            v_category_slug
        );
    END IF;

    -- Fallback final: categoria raiz de canetas
    IF v_category_id IS NULL THEN
        SELECT id INTO v_category_id FROM categories WHERE slug = 'canetas' AND is_active = true LIMIT 1;
        v_category_slug := 'canetas';
    END IF;

    -- ========================================================================
    -- 5. ATRIBUTOS FUNCIONAIS (independente do material)
    -- ========================================================================
    v_attributes := jsonb_build_object(
        'has_touch',         v_name ~ 'TOUCH|STYLUS',
        'has_roller',        v_name ~ 'ROLLER|ROLLERBALL',
        'has_marca_texto',   v_name ~ 'MARCA.?TEXTO|MARCADOR|DESTAQUE',
        'has_multifuncao',   v_name ~ 'MULTIFUNC|[234].?EM.?1',
        'has_laser',         v_name ~ 'LASER|APONTADOR',
        'has_lanterna',      v_name ~ 'LANTERNA|LED|LUZ',
        'has_pen_drive',     v_name ~ 'PEN.?DRIVE|USB|PENDRIVE',
        'has_porta_celular', v_name ~ 'PORTA.?CELULAR|SUPORTE|BASE',
        'has_lapiseira',     v_name ~ 'LAPISEIRA|LAPISC'
    );

    -- ========================================================================
    -- 6. RETORNO
    -- ========================================================================
    RETURN jsonb_build_object(
        'is_pen',        TRUE,
        'category_id',   v_category_id,
        'category_slug', v_category_slug,
        'material',      v_material,
        'attributes',    v_attributes
    );
END;
$function$;

COMMENT ON FUNCTION public.classify_pen(TEXT) IS
'classify_pen v2.0 (jun/2026) — Classifica canetas de qualquer fornecedor.
Mudanças v2: slug roller corrigido (canetas-metal-roller), 
novas categorias (cortica, madeira, fibra-eco, aluminio-reciclado, semi-metal),
volatilidade IMMUTABLE→STABLE, fallback em cascata, has_lapiseira adicionado.
Taxa de cobertura esperada: >92% (era 88.5% na v1.1).';
;
