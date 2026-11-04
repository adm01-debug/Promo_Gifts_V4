CREATE OR REPLACE FUNCTION public.comparar_precos_spot(p_dados_api jsonb)
 RETURNS TABLE(out_table_code character varying, out_table_code_option character varying, out_tecnica_nome character varying, out_area_descricao character varying, out_faixa_preco character varying, out_spot_anterior numeric, out_spot_novo numeric, out_spot_variacao_pct numeric, out_nosso_preco numeric, out_margem_anterior_pct numeric, out_margem_nova_pct numeric, out_margem_variacao_pp numeric, out_nivel_alerta character varying, out_tipo_mudanca character varying)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_item JSONB;
    v_table_code VARCHAR;
    v_table_code_option VARCHAR;
    v_spot_atual RECORD;
    v_nosso_preco_rec RECORD;
    v_faixa INTEGER;
    v_preco_novo NUMERIC;
    v_preco_anterior NUMERIC;
    v_nosso NUMERIC;
    v_variacao_spot NUMERIC;
    v_margem_ant NUMERIC;
    v_margem_nova NUMERIC;
    v_margem_var NUMERIC;
    v_nivel VARCHAR;
    v_tipo VARCHAR;
    v_tecnica_nome VARCHAR;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_dados_api)
    LOOP
        v_table_code := v_item->>'TableCode';
        v_table_code_option := v_item->>'TableCodeOption';
        
        -- Buscar registro atual no banco (usando alias para evitar ambiguidade)
        SELECT s.* INTO v_spot_atual
        FROM spot_customization_tables s
        WHERE s.table_code_option = v_table_code_option;
        
        -- Buscar nosso preço de venda
        SELECT p.* INTO v_nosso_preco_rec
        FROM personalizacao_precos p
        WHERE p.spot_table_code_option = v_table_code_option
        AND p.is_active = true;
        
        -- Buscar nome da técnica
        SELECT e.spot_tecnica_nome INTO v_tecnica_nome
        FROM spot_tecnica_equivalencia e
        WHERE v_table_code LIKE e.spot_sigla || '%'
        LIMIT 1;
        
        -- Comparar cada faixa de preço (1, 5, 10)
        FOR v_faixa IN SELECT unnest(ARRAY[1, 5, 10])
        LOOP
            -- Extrair preço novo da API
            v_preco_novo := (v_item->>format('Price%s', v_faixa))::NUMERIC;
            
            IF v_preco_novo IS NULL OR v_preco_novo = 0 THEN
                CONTINUE;
            END IF;
            
            -- Extrair preço anterior do banco
            EXECUTE format('SELECT s.price_%s FROM spot_customization_tables s WHERE s.table_code_option = $1', v_faixa)
            INTO v_preco_anterior
            USING v_table_code_option;
            
            -- Extrair nosso preço
            IF v_nosso_preco_rec IS NOT NULL THEN
                EXECUTE format('SELECT p.price_%s FROM personalizacao_precos p WHERE p.spot_table_code_option = $1 AND p.is_active = true', v_faixa)
                INTO v_nosso
                USING v_table_code_option;
            ELSE
                v_nosso := NULL;
            END IF;
            
            -- Verificar se houve mudança
            IF v_preco_anterior IS NOT NULL AND v_preco_novo != v_preco_anterior THEN
                
                -- Calcular variação SPOT
                IF v_preco_anterior > 0 THEN
                    v_variacao_spot := ((v_preco_novo - v_preco_anterior) / v_preco_anterior) * 100;
                ELSE
                    v_variacao_spot := 100;
                END IF;
                
                -- Tipo de mudança
                IF v_preco_novo > v_preco_anterior THEN
                    v_tipo := 'AUMENTO';
                ELSE
                    v_tipo := 'REDUCAO';
                END IF;
                
                -- Calcular margens
                IF v_nosso IS NOT NULL AND v_nosso > 0 THEN
                    IF v_preco_anterior > 0 THEN
                        v_margem_ant := ((v_nosso - v_preco_anterior) / v_preco_anterior) * 100;
                    ELSE
                        v_margem_ant := NULL;
                    END IF;
                    
                    IF v_preco_novo > 0 THEN
                        v_margem_nova := ((v_nosso - v_preco_novo) / v_preco_novo) * 100;
                    ELSE
                        v_margem_nova := NULL;
                    END IF;
                    
                    IF v_margem_ant IS NOT NULL AND v_margem_nova IS NOT NULL THEN
                        v_margem_var := v_margem_nova - v_margem_ant;
                    ELSE
                        v_margem_var := NULL;
                    END IF;
                ELSE
                    v_margem_ant := NULL;
                    v_margem_nova := NULL;
                    v_margem_var := NULL;
                END IF;
                
                -- Determinar nível do alerta
                IF v_margem_nova IS NOT NULL AND v_margem_nova < 0 THEN
                    v_nivel := 'CRITICO';
                ELSIF v_margem_var IS NOT NULL THEN
                    IF v_margem_var < -15 THEN
                        v_nivel := 'URGENTE';
                    ELSIF v_margem_var < -5 THEN
                        v_nivel := 'ATENCAO';
                    ELSE
                        v_nivel := 'INFO';
                    END IF;
                ELSE
                    IF ABS(v_variacao_spot) > 15 THEN
                        v_nivel := 'ATENCAO';
                    ELSE
                        v_nivel := 'INFO';
                    END IF;
                END IF;
                
                -- Retornar resultado
                RETURN QUERY SELECT
                    v_table_code::VARCHAR,
                    v_table_code_option::VARCHAR,
                    COALESCE(v_tecnica_nome, v_spot_atual.customization_type_name)::VARCHAR,
                    v_spot_atual.max_area_cm::VARCHAR,
                    format('price_%s', v_faixa)::VARCHAR,
                    v_preco_anterior,
                    v_preco_novo,
                    ROUND(v_variacao_spot, 2),
                    v_nosso,
                    ROUND(v_margem_ant, 2),
                    ROUND(v_margem_nova, 2),
                    ROUND(v_margem_var, 2),
                    v_nivel::VARCHAR,
                    v_tipo::VARCHAR;
            END IF;
        END LOOP;
    END LOOP;
    RETURN;
END;
$function$
