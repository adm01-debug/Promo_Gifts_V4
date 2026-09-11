
-- MELHORIA-08: Expor usa_faixa_dimensional na resposta de fn_get_product_customization_options
-- O adapter agora o lê como alias de usa_dimensao, mas a função não o retornava explicitamente.
-- Adicionamos o campo diretamente no JSON para eliminar a necessidade do pick() no adapter.

CREATE OR REPLACE FUNCTION public.fn_get_product_customization_options(p_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'product_id', p_product_id,
        'locations', COALESCE(jsonb_agg(loc_data ORDER BY loc_order), '[]'::jsonb)
    )
    INTO v_result
    FROM (
        SELECT
            pat.location_code,
            pat.location_name,
            pat.location_order AS loc_order,
            jsonb_build_object(
                'location_code', pat.location_code,
                'location_name', pat.location_name,
                'location_order', pat.location_order,
                'options', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'technique_id',       p2.id,
                            'grupo_tecnica',      t.grupo_tecnica,
                            'tecnica_nome',       t.nome,
                            'variacao_label',     t.nome,
                            'codigo_tabela',      t.codigo_tabela,
                            'cobra_por_cor',      t.cobra_por_cor,
                            'max_cores',          COALESCE(t.max_cores, 1),
                            'custo_setup',        COALESCE(t.custo_setup, 0),
                            'max_width',          p2.max_width,
                            'max_height',         p2.max_height,
                            'gravacao_largura_max', p2.max_width,
                            'gravacao_altura_max',  p2.max_height,
                            'is_curved',          p2.is_curved,
                            'shape',              p2.shape,
                            -- Expor usa_faixa_dimensional explicitamente:
                            -- adapter lê 'usa_faixa_dimensional' → converte para usa_dimensao
                            'usa_faixa_dimensional', COALESCE(t.usa_faixa_dimensional, false),
                            'usa_dimensao',       COALESCE(t.usa_faixa_dimensional, false),
                            'efetiva_largura_max', p2.max_width,
                            'efetiva_altura_max',  p2.max_height,
                            -- Extras para o ConfigurationPanelV6
                            'markup_percent',     COALESCE(t.markup_percent, 0),
                            'preco_minimo_unitario', COALESCE(t.preco_minimo_unitario, 0)
                        )
                    ORDER BY t.grupo_tecnica, t.codigo_tabela), '[]'::jsonb)
                    FROM print_area_techniques p2
                    JOIN tabela_preco_gravacao_oficial t ON t.id = p2.tabela_preco_id
                    WHERE p2.product_id = p_product_id
                      AND p2.location_code = pat.location_code
                      AND p2.is_active = true
                      AND t.ativo = true
                )
            ) AS loc_data
        FROM (
            SELECT DISTINCT location_code, location_name, location_order
            FROM print_area_techniques
            WHERE product_id = p_product_id
              AND is_active = true
        ) pat
        ORDER BY pat.location_order
    ) sub;

    RETURN v_result;
END;
$function$;

-- Manter GRANTs
GRANT EXECUTE ON FUNCTION public.fn_get_product_customization_options(uuid)
  TO authenticated, anon;
;
