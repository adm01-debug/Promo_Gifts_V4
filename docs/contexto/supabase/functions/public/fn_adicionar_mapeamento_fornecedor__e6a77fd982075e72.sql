CREATE OR REPLACE FUNCTION public.fn_adicionar_mapeamento_fornecedor(p_supplier_id uuid, p_nome_fornecedor character varying, p_tecnica_variante_codigo character varying, p_table_code character varying DEFAULT NULL::character varying, p_regra_formato character varying DEFAULT 'qualquer'::character varying, p_observacao text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_variante_id UUID;
    v_mapeamento_id UUID;
BEGIN
    -- Buscar ID da variante pelo código
    SELECT id INTO v_variante_id
    FROM tecnica_gravacao_variante
    WHERE codigo = p_tecnica_variante_codigo;
    
    IF v_variante_id IS NULL THEN
        RAISE EXCEPTION 'Variante de técnica não encontrada: %', p_tecnica_variante_codigo;
    END IF;
    
    -- Inserir mapeamento
    INSERT INTO supplier_tecnica_mapeamento (
        supplier_id,
        supplier_customization_type,
        supplier_table_code,
        tecnica_variante_id,
        regra_formato,
        regra_observacao,
        mapeamento_automatico,
        ativo
    ) VALUES (
        p_supplier_id,
        p_nome_fornecedor,
        p_table_code,
        v_variante_id,
        p_regra_formato,
        p_observacao,
        true,
        true
    )
    RETURNING id INTO v_mapeamento_id;
    
    RETURN v_mapeamento_id;
END;
$function$
