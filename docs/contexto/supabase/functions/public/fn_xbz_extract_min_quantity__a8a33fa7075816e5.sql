CREATE OR REPLACE FUNCTION public.fn_xbz_extract_min_quantity(p_raw_data jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_api_value  text;
    v_desc       text;
    v_match      text[];
    v_result     integer;
BEGIN
    -- ── Fonte 1: VendaMinima da API (primária) ────────────────────────────
    v_api_value := p_raw_data->>'VendaMinima';

    IF v_api_value IS NOT NULL AND v_api_value ~ '^\d+$' THEN
        v_result := v_api_value::integer;
        IF v_result > 0 THEN
            RETURN v_result;
        END IF;
    END IF;

    -- ── Fonte 2: regex na descrição (fallback) ────────────────────────────
    -- Padrões cobertos:
    -- "OBS.: PEDIDOS MÍNIMO DE 50 PEÇAS!"
    -- "PEDIDO MÍNIMO DE 100 PEÇAS"
    -- "PEDIDO MÍNIMO: 10 PÇS"
    v_desc := p_raw_data->>'Descricao';

    IF v_desc IS NOT NULL THEN
        v_match := regexp_match(
            v_desc,
            'PEDIDOS?\s*M[ÍI]NIMO\s*(?:DE\s*|:\s*)?(\d+)\s*P(?:E[ÇC]AS?|[ÇC]S)',
            'i'
        );
        IF v_match IS NOT NULL AND array_length(v_match, 1) > 0 THEN
            v_result := v_match[1]::integer;
            IF v_result > 0 THEN
                RETURN v_result;
            END IF;
        END IF;
    END IF;

    -- ── Sem fonte ─────────────────────────────────────────────────────────
    RETURN NULL;
END;
$function$
