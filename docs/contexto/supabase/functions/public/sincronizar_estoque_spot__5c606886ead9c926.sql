CREATE OR REPLACE FUNCTION public.sincronizar_estoque_spot(p_stock_data jsonb, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_item JSONB;
    v_sku VARCHAR;
    v_quantity INTEGER;
    v_variant_id UUID;
    v_stock_before INTEGER;
    v_processed INTEGER := 0;
    v_updated INTEGER := 0;
    v_errors INTEGER := 0;
    v_not_found INTEGER := 0;
    v_error_list JSONB := '[]'::jsonb;
BEGIN
    IF p_stock_data IS NULL OR jsonb_array_length(p_stock_data) = 0 THEN
        RETURN json_build_object('success', false, 'error', 'Dados de estoque vazios ou inválidos');
    END IF;
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_stock_data)
    LOOP
        v_processed := v_processed + 1;
        v_sku := v_item->>'sku';
        v_quantity := (v_item->>'quantity')::INTEGER;
        IF v_sku IS NULL OR v_sku = '' THEN
            v_errors := v_errors + 1;
            v_error_list := v_error_list || jsonb_build_object('index', v_processed, 'error', 'SKU vazio ou nulo');
            CONTINUE;
        END IF;
        SELECT id, COALESCE(stock_quantity, 0) INTO v_variant_id, v_stock_before FROM product_variants WHERE sku = v_sku;
        IF v_variant_id IS NULL THEN
            v_not_found := v_not_found + 1;
            v_error_list := v_error_list || jsonb_build_object('sku', v_sku, 'error', 'Variante não encontrada');
            CONTINUE;
        END IF;
        IF v_stock_before != v_quantity THEN
            INSERT INTO archive.stock_movements (id, variant_id, movement_type, quantity, stock_before, stock_after, reference_type, notes, created_by, created_at)
            VALUES (gen_random_uuid(), v_variant_id,
                    CASE WHEN v_quantity > v_stock_before THEN 'ENTRADA' ELSE 'SAIDA' END,
                    v_quantity - v_stock_before, v_stock_before, v_quantity, 'SYNC_SPOT',
                    format('Sincronização automática SPOT. Anterior: %s, Novo: %s', v_stock_before, v_quantity), p_user_id, NOW());
            UPDATE product_variants SET stock_quantity = v_quantity, updated_at = NOW() WHERE id = v_variant_id;
            v_updated := v_updated + 1;
        END IF;
    END LOOP;
    RETURN json_build_object('success', true, 'processed', v_processed, 'updated', v_updated,
                             'unchanged', v_processed - v_updated - v_errors - v_not_found,
                             'not_found', v_not_found, 'errors', v_errors, 'error_details', v_error_list);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM, 'processed', v_processed);
END;
$function$
