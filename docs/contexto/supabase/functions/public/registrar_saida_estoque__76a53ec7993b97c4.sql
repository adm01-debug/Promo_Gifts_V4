CREATE OR REPLACE FUNCTION public.registrar_saida_estoque(p_variant_sku character varying, p_quantity integer, p_movement_type character varying DEFAULT 'VENDA'::character varying, p_document_number character varying DEFAULT NULL::character varying, p_notes text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid, p_allow_negative boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'archive'
AS $function$
DECLARE
    v_variant_id UUID;
    v_stock_before INTEGER;
    v_stock_after INTEGER;
    v_movement_id UUID;
BEGIN
    IF p_quantity <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'Quantidade deve ser maior que zero');
    END IF;
    IF p_movement_type NOT IN ('VENDA', 'RESERVA', 'AJUSTE', 'PERDA', 'DEVOLUCAO_FORNECEDOR') THEN
        RETURN json_build_object('success', false, 'error', format('Tipo de movimento inválido: %s', p_movement_type));
    END IF;
    SELECT id INTO v_variant_id FROM product_variants WHERE sku = p_variant_sku;
    IF v_variant_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', format('Variante não encontrada: %s', p_variant_sku));
    END IF;
    SELECT COALESCE(stock_quantity, 0) INTO v_stock_before FROM product_variants WHERE id = v_variant_id;
    IF v_stock_before < p_quantity AND NOT p_allow_negative THEN
        RETURN json_build_object('success', false, 'error', 'Estoque insuficiente', 'stock_available', v_stock_before, 'quantity_requested', p_quantity);
    END IF;
    v_stock_after := v_stock_before - p_quantity;
    INSERT INTO archive.stock_movements (id, variant_id, movement_type, quantity, stock_before, stock_after, reference_type, reference_number, notes, created_by, created_at)
    VALUES (gen_random_uuid(), v_variant_id, 'SAIDA', -p_quantity, v_stock_before, v_stock_after, p_movement_type, p_document_number,
            COALESCE(p_notes, format('Saída de %s unidades - Tipo: %s', p_quantity, p_movement_type)), p_user_id, NOW())
    RETURNING id INTO v_movement_id;
    UPDATE product_variants SET stock_quantity = v_stock_after, updated_at = NOW() WHERE id = v_variant_id;
    RETURN json_build_object('success', true, 'movement_id', v_movement_id, 'variant_id', v_variant_id, 'sku', p_variant_sku,
                             'quantity_removed', p_quantity, 'stock_before', v_stock_before, 'stock_after', v_stock_after, 'movement_type', p_movement_type);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$
