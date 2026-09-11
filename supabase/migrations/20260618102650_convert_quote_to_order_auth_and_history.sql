-- Melhoria #4: convert_quote_to_order com check explícito de autorização + audit trail.
--
-- Problemas:
-- (a) A função dependia EXCLUSIVAMENTE do RLS implícito (SELECT falha se caller não vê o quote)
--     para barrar acesso não autorizado. Falta check explícito: o caller deve ser o dono do
--     orçamento ou coord+; o p_seller_id passado deve ser auth.uid() ou um usuario permitido.
-- (b) Nenhum registro era criado em quote_history ao converter — ação crítica sem trilha.
--
-- Solução:
-- (a) Verifica: se não é service_role, exige que auth.uid() = p_seller_id OU coord+.
--     Nota: RLS já bloqueia SELECT do quote se caller não tiver acesso; o check explícito
--     adiciona defesa em profundidade para garantir que p_seller_id não seja "forjado".
-- (b) Insere em quote_history com action='converted' e referência ao pedido gerado.
CREATE OR REPLACE FUNCTION public.convert_quote_to_order(
  p_quote_id       uuid,
  p_seller_id      uuid,
  p_organization_id uuid DEFAULT NULL::uuid
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_quote       RECORD;
  v_order_id    UUID;
  v_order_number TEXT;
  v_item        RECORD;
  v_new_item_id UUID;
  v_actor_id    UUID;
BEGIN
  -- ── 0. Auth check explícito (além do RLS implícito via SELECT abaixo) ────
  -- Em contexto service_role (automações internas) a checagem é dispensada.
  IF current_setting('request.jwt.claim.role', true) <> 'service_role' AND auth.uid() IS NOT NULL THEN
    IF auth.uid() <> p_seller_id AND NOT public.is_coord_or_above(auth.uid()) THEN
      RAISE EXCEPTION
        'Sem permissão: apenas o vendedor responsável ou um coordenador pode converter este orçamento'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- ── 1. Carrega o orçamento (RLS aplicado — SECURITY INVOKER) ─────────────
  SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orçamento não encontrado'; END IF;
  IF v_quote.status != 'approved' THEN
    RAISE EXCEPTION 'Apenas orçamentos aprovados podem ser convertidos';
  END IF;
  IF EXISTS (SELECT 1 FROM public.orders WHERE quote_id = p_quote_id) THEN
    RAISE EXCEPTION 'Este orçamento já foi convertido em pedido';
  END IF;

  -- ── 2. Cria o pedido ──────────────────────────────────────────────────────
  INSERT INTO public.orders (
    seller_id, organization_id, quote_id, client_id, client_name, client_email,
    client_phone, client_company, subtotal, discount_amount, shipping_cost,
    shipping_type, total, payment_terms, delivery_time, notes, internal_notes,
    status, fulfillment_status
  ) VALUES (
    p_seller_id,
    COALESCE(p_organization_id, v_quote.organization_id),
    p_quote_id,
    v_quote.client_id, v_quote.client_name, v_quote.client_email,
    v_quote.client_phone, v_quote.client_company,
    v_quote.subtotal, v_quote.discount_amount, v_quote.shipping_cost,
    v_quote.shipping_type, v_quote.total, v_quote.payment_terms,
    v_quote.delivery_time, v_quote.notes, v_quote.internal_notes,
    'confirmed', 'pending'
  ) RETURNING id, order_number INTO v_order_id, v_order_number;

  -- ── 3. Copia itens ────────────────────────────────────────────────────────
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

  -- ── 4. Atualiza status do orçamento ───────────────────────────────────────
  UPDATE public.quotes
  SET    status = 'converted',
         converted_to_order_id = v_order_id,
         converted_at = now()
  WHERE  id = p_quote_id;

  -- ── 5. Audit trail ────────────────────────────────────────────────────────
  v_actor_id := COALESCE(auth.uid(), p_seller_id);
  IF v_actor_id IS NOT NULL THEN
    INSERT INTO public.quote_history (quote_id, user_id, action, description, metadata)
    VALUES (
      p_quote_id,
      v_actor_id,
      'converted',
      format('Orçamento %s convertido em pedido %s',
             v_quote.quote_number, v_order_number),
      jsonb_build_object(
        'order_id',     v_order_id,
        'order_number', v_order_number,
        'total',        v_quote.total,
        'n_items',      (SELECT count(*) FROM public.order_items WHERE order_id = v_order_id)
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'id',           v_order_id,
    'order_number', v_order_number,
    'status',       'confirmed',
    'total',        v_quote.total
  );
END;
$function$;;
