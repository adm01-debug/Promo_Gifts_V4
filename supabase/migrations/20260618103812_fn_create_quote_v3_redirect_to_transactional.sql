-- Melhoria #3: fn_create_quote_v3 vira thin-wrapper sobre create_quote_transactional.
--
-- Problema: a função legada ainda era chamável como RPC, gravava action='created_v3' no history
-- (inconsistente com 'created' da nova RPC), não aplicava as validações da nova stack e
-- usava padrões antigos (markup sem clamp, valid_until como TIMESTAMPTZ vs date).
--
-- Solução: redirecionar para create_quote_transactional internamente, preservando a assinatura
-- original para retrocompatibilidade de callers existentes (retorna o mesmo jsonb {id, quote_number}).
-- client_cnpj é descartado na conversão (campo não existe no novo schema de criação).
-- A nova função escreve action='created' com metadata completo (não mais 'created_v3').
CREATE OR REPLACE FUNCTION public.fn_create_quote_v3(p_quote_data jsonb, p_items_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _result public.quotes;
  _quote_payload  jsonb;
  _items_payload  jsonb;
  _item           jsonb;
  _item_converted jsonb;
BEGIN
  -- Verifica autenticação (mantém comportamento original)
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Converte o payload do formato v3 para o formato esperado por create_quote_transactional
  -- seller_id é sempre auth.uid() (mesma semântica da v3 original)
  _quote_payload := jsonb_build_object(
    'quote_number',               '',
    'client_id',                  p_quote_data->>'client_id',
    'client_name',                COALESCE(p_quote_data->>'client_name', ''),
    'client_email',               p_quote_data->>'client_email',
    'client_phone',               p_quote_data->>'client_phone',
    'client_company',             p_quote_data->>'client_company',
    'seller_id',                  auth.uid()::text,
    'organization_id',            p_quote_data->>'organization_id',
    'status',                     COALESCE(p_quote_data->>'status', 'draft'),
    'subtotal',                   COALESCE(p_quote_data->>'subtotal', '0'),
    'discount_percent',           COALESCE(p_quote_data->>'discount_percent', '0'),
    'discount_amount',            COALESCE(p_quote_data->>'discount_amount', '0'),
    'total',                      COALESCE(p_quote_data->>'total', '0'),
    'negotiation_markup_percent', COALESCE(p_quote_data->>'negotiation_markup_percent', '0'),
    'notes',                      p_quote_data->>'notes',
    'internal_notes',             p_quote_data->>'internal_notes',
    'valid_until',                p_quote_data->>'valid_until',
    'payment_terms',              p_quote_data->>'payment_terms',
    'delivery_time',              p_quote_data->>'delivery_time',
    'shipping_type',              p_quote_data->>'shipping_type',
    'shipping_cost',              COALESCE(p_quote_data->>'shipping_cost', '0')
  );

  -- Garante que os itens tenham 'personalizations' (v3 não exigia o campo)
  SELECT jsonb_agg(
    item || CASE WHEN item ? 'personalizations' THEN '{}'::jsonb
                 ELSE jsonb_build_object('personalizations','[]'::jsonb)
            END)
  INTO _items_payload
  FROM jsonb_array_elements(COALESCE(p_items_data,'[]'::jsonb)) AS item;

  _items_payload := COALESCE(_items_payload, '[]'::jsonb);

  -- Delega para a RPC canônica (inclui audit trail, validações, atomic)
  _result := public.create_quote_transactional(_quote_payload, _items_payload);

  -- Retorna no mesmo formato da v3 original para retrocompatibilidade
  RETURN jsonb_build_object('id', _result.id, 'quote_number', _result.quote_number);
END;
$function$;;
