
-- FIX: convert_quote_to_order usava 'unfulfilled' (inválido) → corrigir para 'pending'
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
        'confirmed', 'pending'  -- FIX: era 'unfulfilled' (violava check constraint)
    ) RETURNING id, order_number INTO v_order_id, v_order_number;

    FOR v_item IN SELECT * FROM public.quote_items WHERE quote_id = p_quote_id LOOP
        INSERT INTO public.order_items (
            order_id, organization_id, product_id, product_sku, product_name,
            product_image_url, quantity, unit_price, color_name, color_hex,
            notes, size_code, gender, kit_group_id, kit_name
        ) VALUES (
            v_order_id, COALESCE(p_organization_id, v_quote.organization_id), 
            v_item.product_id, v_item.product_sku, v_item.product_name,
            v_item.product_image_url, v_item.quantity, v_item.unit_price, 
            v_item.color_name, v_item.color_hex,
            v_item.notes, v_item.size_code, v_item.gender, 
            v_item.kit_group_id, v_item.kit_name
        ) RETURNING id INTO v_new_item_id;

        INSERT INTO public.order_item_personalizations (
            order_item_id, technique_id, technique_name, location_id, 
            location_name, image_url, personalization_text, price_adjustment
        )
        SELECT v_new_item_id, technique_id, technique_name, location_id, 
            location_name, image_url, personalization_text, price_adjustment
        FROM public.quote_item_personalizations
        WHERE quote_item_id = v_item.id;
    END LOOP;

    UPDATE public.quotes SET status = 'converted', converted_to_order_id = v_order_id, converted_at = now() 
    WHERE id = p_quote_id;

    RETURN jsonb_build_object('id', v_order_id, 'order_number', v_order_number, 'status', 'confirmed');
END;
$function$;
;
