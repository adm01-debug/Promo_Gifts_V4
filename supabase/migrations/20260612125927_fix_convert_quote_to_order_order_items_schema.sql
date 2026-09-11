
-- FIX: convert_quote_to_order usava colunas que não existem em order_items
-- (organization_id, color_name, color_hex, size_code, gender, kit_group_id, kit_name)
CREATE OR REPLACE FUNCTION public.convert_quote_to_order(
    p_quote_id uuid, 
    p_seller_id uuid, 
    p_organization_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    v_quote RECORD;
    v_order_id UUID;
    v_order_number TEXT;
    v_item RECORD;
    v_new_item_id UUID;
BEGIN
    SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Orçamento não encontrado'; END IF;
    IF v_quote.status != 'approved' THEN RAISE EXCEPTION 'Apenas orçamentos aprovados podem ser convertidos'; END IF;
    IF EXISTS (SELECT 1 FROM public.orders WHERE quote_id = p_quote_id) THEN
        RAISE EXCEPTION 'Este orçamento já foi convertido em pedido';
    END IF;

    -- Criar o pedido (order)
    INSERT INTO public.orders (
        seller_id, organization_id, quote_id, client_id, client_name, client_email,
        client_phone, client_company, subtotal, discount_amount, shipping_cost,
        shipping_type, total, payment_terms, delivery_time, notes, internal_notes,
        status, fulfillment_status
    ) VALUES (
        p_seller_id, COALESCE(p_organization_id, v_quote.organization_id), p_quote_id, 
        v_quote.client_id, v_quote.client_name, v_quote.client_email,
        v_quote.client_phone, v_quote.client_company, v_quote.subtotal, 
        v_quote.discount_amount, v_quote.shipping_cost,
        v_quote.shipping_type, v_quote.total, v_quote.payment_terms, 
        v_quote.delivery_time, v_quote.notes, v_quote.internal_notes,
        'confirmed', 'pending'
    ) RETURNING id, order_number INTO v_order_id, v_order_number;

    -- Copiar itens do orçamento para o pedido (usando apenas colunas existentes em order_items)
    FOR v_item IN SELECT * FROM public.quote_items WHERE quote_id = p_quote_id LOOP
        INSERT INTO public.order_items (
            order_id, quote_item_id, product_id, product_sku, product_name,
            product_image_url, quantity, unit_price, subtotal,
            discount_amount, personalization_cost
        ) VALUES (
            v_order_id, v_item.id, v_item.product_id, v_item.product_sku, v_item.product_name,
            v_item.product_image_url, v_item.quantity, v_item.unit_price, v_item.subtotal,
            COALESCE(v_item.discount_amount, 0), COALESCE(v_item.personalization_cost, 0)
        ) RETURNING id INTO v_new_item_id;
    END LOOP;

    -- Marcar orçamento como convertido
    UPDATE public.quotes 
    SET status = 'converted', converted_to_order_id = v_order_id, converted_at = now() 
    WHERE id = p_quote_id;

    RETURN jsonb_build_object(
        'id', v_order_id, 
        'order_number', v_order_number, 
        'status', 'confirmed',
        'total', v_quote.total
    );
END;
$function$;
;
