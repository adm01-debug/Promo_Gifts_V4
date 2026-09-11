-- ============================================================================
-- MIGRATION: fn_auto_vincular_cor_variante_use_canonical_matcher_20260619
-- Fecha o silver gap: trigger BEFORE INSERT/UPDATE em product_variants
-- agora usa fn_match_canonical_color como estratégia 3 (fallback canônico),
-- aproveitando todas as 5 prioridades da função mestre de resolução de cores.
--
-- Gap anterior: apenas 2 estratégias (código SPOT + nome exato).
-- Produtos ASIA/XBZ/SóMarcas sem código SPOT e com nome não-exato
-- chegavam a gold com color_id = NULL quando fn_match_canonical_color
-- resolveria via P3/P4 (color_equivalences) ou P5 (color_groups partial).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_auto_vincular_cor_variante()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    v_codigo_cor     TEXT;
    v_nome_cor       TEXT;
    v_variation_id   UUID;
    v_variation_name TEXT;
    v_variation_hex  TEXT;
BEGIN
    v_codigo_cor := NEW.attributes->>'codigo_cor';
    v_nome_cor   := NEW.attributes->>'cor';

    -- Se já tem color_id preenchido, não sobrescrever
    IF NEW.color_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- ────────────────────────────────────────────────────────────────────────
    -- ESTRATÉGIA 1: código SPOT via color_equivalences (mais específico)
    -- ────────────────────────────────────────────────────────────────────────
    IF v_codigo_cor IS NOT NULL THEN
        SELECT cv.id, cv.name, cv.hex_code
        INTO v_variation_id, v_variation_name, v_variation_hex
        FROM supplier_colors sc
        JOIN color_equivalences ce ON ce.supplier_color_id = sc.id AND ce.is_active = true
        JOIN color_variations cv   ON cv.id = ce.promo_variation_id AND cv.is_active = true
        WHERE sc.code = v_codigo_cor
        ORDER BY ce.confidence_score DESC NULLS LAST
        LIMIT 1;

        IF v_variation_id IS NOT NULL THEN
            NEW.color_id   := v_variation_id;
            NEW.color_name := v_variation_name;
            NEW.color_hex  := v_variation_hex;
            RETURN NEW;
        END IF;
    END IF;

    -- ────────────────────────────────────────────────────────────────────────
    -- ESTRATÉGIA 2: match exato de nome em color_variations (rápido)
    -- ────────────────────────────────────────────────────────────────────────
    IF v_nome_cor IS NOT NULL THEN
        SELECT cv.id, cv.name, cv.hex_code
        INTO v_variation_id, v_variation_name, v_variation_hex
        FROM color_variations cv
        WHERE cv.is_active = true
          AND (
              LOWER(TRIM(cv.name)) = LOWER(TRIM(v_nome_cor))
              OR LOWER(cv.name) LIKE LOWER(TRIM(v_nome_cor)) || '%'
          )
        ORDER BY
            CASE WHEN LOWER(TRIM(cv.name)) = LOWER(TRIM(v_nome_cor)) THEN 1 ELSE 2 END,
            LENGTH(cv.name)
        LIMIT 1;

        IF v_variation_id IS NOT NULL THEN
            NEW.color_id   := v_variation_id;
            NEW.color_name := v_variation_name;
            NEW.color_hex  := v_variation_hex;
            RETURN NEW;
        END IF;
    END IF;

    -- ────────────────────────────────────────────────────────────────────────
    -- ESTRATÉGIA 3 (GAP FIX): fn_match_canonical_color como fallback canônico
    -- Abrange P1-P5: hex exato, supplier_colors por nome/hex via equivalences,
    -- e match parcial via color_groups.
    -- Usa color_name já normalizado em NEW ou extrai de attributes.
    -- ────────────────────────────────────────────────────────────────────────
    DECLARE
        v_match_name TEXT := COALESCE(NEW.color_name, v_nome_cor);
        v_match_hex  TEXT := COALESCE(NEW.color_hex, NEW.attributes->>'hex');
    BEGIN
        IF v_match_name IS NOT NULL OR v_match_hex IS NOT NULL THEN
            v_variation_id := public.fn_match_canonical_color(v_match_name, v_match_hex);

            IF v_variation_id IS NOT NULL THEN
                SELECT cv.name, cv.hex_code
                INTO v_variation_name, v_variation_hex
                FROM color_variations cv
                WHERE cv.id = v_variation_id;

                NEW.color_id   := v_variation_id;
                NEW.color_name := COALESCE(NEW.color_name, v_variation_name);
                NEW.color_hex  := COALESCE(NEW.color_hex, v_variation_hex);
            END IF;
        END IF;
    END;

    RETURN NEW;
END;
$function$;

SELECT 'fn_auto_vincular_cor_variante atualizado com fn_match_canonical_color fallback' AS status;
;
