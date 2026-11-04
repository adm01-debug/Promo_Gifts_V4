CREATE OR REPLACE FUNCTION public.gerar_resumo_alertas_bitrix(p_data_inicio timestamp with time zone DEFAULT (now() - '1 day'::interval))
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_resultado JSONB;
    v_alertas JSONB;
    v_resumo JSONB;
BEGIN
    -- Buscar resumo
    SELECT jsonb_build_object(
        'total', COUNT(*),
        'criticos', COUNT(*) FILTER (WHERE nivel_alerta = 'CRITICO'),
        'urgentes', COUNT(*) FILTER (WHERE nivel_alerta = 'URGENTE'),
        'atencao', COUNT(*) FILTER (WHERE nivel_alerta = 'ATENCAO'),
        'info', COUNT(*) FILTER (WHERE nivel_alerta = 'INFO'),
        'aumentos', COUNT(*) FILTER (WHERE tipo_mudanca = 'AUMENTO'),
        'reducoes', COUNT(*) FILTER (WHERE tipo_mudanca = 'REDUCAO'),
        'novos', COUNT(*) FILTER (WHERE tipo_mudanca = 'NOVO')
    ) INTO v_resumo
    FROM spot_price_change_log
    WHERE detectado_em >= p_data_inicio
    AND bitrix_notificado = FALSE;
    
    -- Buscar alertas críticos e urgentes (detalhes)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', id,
            'tabela', table_code_option,
            'tecnica', tecnica_nome,
            'area', area_descricao,
            'faixa', faixa_preco,
            'spot_anterior', spot_valor_anterior,
            'spot_novo', spot_valor_novo,
            'variacao_spot', spot_variacao_percentual,
            'nosso_preco', nosso_preco_atual,
            'margem_anterior', margem_anterior_percentual,
            'margem_nova', margem_nova_percentual,
            'impacto_margem', margem_variacao_pp,
            'nivel', nivel_alerta,
            'tipo', tipo_mudanca
        ) ORDER BY 
            CASE nivel_alerta 
                WHEN 'CRITICO' THEN 1 
                WHEN 'URGENTE' THEN 2 
                WHEN 'ATENCAO' THEN 3 
                ELSE 4 
            END,
            ABS(COALESCE(margem_variacao_pp, 0)) DESC
    ), '[]'::JSONB) INTO v_alertas
    FROM spot_price_change_log
    WHERE detectado_em >= p_data_inicio
    AND bitrix_notificado = FALSE
    AND nivel_alerta IN ('CRITICO', 'URGENTE', 'ATENCAO');
    
    -- Montar resultado
    v_resultado := jsonb_build_object(
        'data_verificacao', NOW(),
        'periodo_inicio', p_data_inicio,
        'resumo', v_resumo,
        'alertas_prioritarios', v_alertas
    );
    
    RETURN v_resultado;
END;
$function$
