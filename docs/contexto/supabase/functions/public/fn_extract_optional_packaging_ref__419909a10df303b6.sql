CREATE OR REPLACE FUNCTION public.fn_extract_optional_packaging_ref(p_description text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE v_match TEXT[];
BEGIN
    IF p_description IS NULL THEN RETURN NULL; END IF;

    -- Padrão 1: "Caixa branca 94651 vendida opcionalmente"
    v_match := regexp_match(p_description, '[Cc]aixa\s+\w*\s*(\d{5})\s+vendida?\s+opcionalmente', 'i');
    IF v_match IS NOT NULL AND v_match[1] IS NOT NULL THEN RETURN v_match[1]; END IF;

    -- Padrão 2: "embalagem opcional: 94651" ou "embalagem vendida opcionalmente: 94651"
    v_match := regexp_match(p_description, 'embalagem\s+(?:opcional|vendida\s+opcionalmente)[:\s]+(\d{5})', 'i');
    IF v_match IS NOT NULL AND v_match[1] IS NOT NULL THEN RETURN v_match[1]; END IF;

    -- Padrão 3: genérico "\d{5} (embalagem/bolsa/caixa)" com contexto "opcionalmente"
    v_match := regexp_match(p_description, '(\d{5})\s+\((?:bolsa|caixa|estojo|saco|sacola)[^)]*\).*opcionalmente', 'i');
    IF v_match IS NOT NULL AND v_match[1] IS NOT NULL THEN RETURN v_match[1]; END IF;

    RETURN NULL;
END;
$function$
