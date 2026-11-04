CREATE OR REPLACE FUNCTION public.registrar_mudancas_preco_spot(p_dados_api jsonb)
 RETURNS TABLE(total_mudancas integer, criticos integer, urgentes integer, atencao integer, info integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_mudanca RECORD;
    v_total INTEGER := 0;
    v_criticos INTEGER := 0;
    v_urgentes INTEGER := 0;
    v_atencao INTEGER := 0;
    v_info INTEGER := 0;
BEGIN
    FOR v_mudanca IN 
        SELECT * FROM comparar_precos_spot(p_dados_api)
    LOOP
        INSERT INTO spot_price_change_log (
            table_code,
            table_code_option,
            tecnica_nome,
            area_descricao,
            spot_valor_anterior,
            spot_valor_novo,
            spot_variacao_percentual,
            nosso_preco_atual,
            margem_anterior_percentual,
            margem_nova_percentual,
            margem_variacao_pp,
            faixa_preco,
            nivel_alerta,
            tipo_mudanca
        ) VALUES (
            v_mudanca.out_table_code,
            v_mudanca.out_table_code_option,
            v_mudanca.out_tecnica_nome,
            v_mudanca.out_area_descricao,
            v_mudanca.out_spot_anterior,
            v_mudanca.out_spot_novo,
            v_mudanca.out_spot_variacao_pct,
            v_mudanca.out_nosso_preco,
            v_mudanca.out_margem_anterior_pct,
            v_mudanca.out_margem_nova_pct,
            v_mudanca.out_margem_variacao_pp,
            v_mudanca.out_faixa_preco,
            v_mudanca.out_nivel_alerta,
            v_mudanca.out_tipo_mudanca
        );
        
        v_total := v_total + 1;
        CASE v_mudanca.out_nivel_alerta
            WHEN 'CRITICO' THEN v_criticos := v_criticos + 1;
            WHEN 'URGENTE' THEN v_urgentes := v_urgentes + 1;
            WHEN 'ATENCAO' THEN v_atencao := v_atencao + 1;
            ELSE v_info := v_info + 1;
        END CASE;
    END LOOP;
    
    RETURN QUERY SELECT v_total, v_criticos, v_urgentes, v_atencao, v_info;
END;
$function$
