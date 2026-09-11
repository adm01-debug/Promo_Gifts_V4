-- Melhoria #3: audit trail em update_quote_transactional.
-- Problema: nenhum registro de edição era salvo em quote_history — impossível rastrear
-- quem editou o quê e quando. Campos de status, desconto e markup são especialmente críticos.
-- Solução: INSERT em quote_history ao final, com ação diferenciada por tipo de mudança:
--   - 'status_changed' quando o status muda
--   - 'updated' nos demais casos
-- Inclui snapshot de campos-chave no metadata para diff futuro.
CREATE OR REPLACE FUNCTION public.update_quote_transactional(
  _quote_id    uuid,
  _quote_patch jsonb,
  _items       jsonb
)
 RETURNS quotes
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  _updated_quote  public.quotes;
  _prev_status    text;
  _prev_total     numeric;
  _item           jsonb;
  _pers           jsonb;
  _new_item_id    uuid;
  _actor_id       uuid;
  _action         text;
  _desc           text;
begin
  -- ── 0. Captura estado anterior para o diff do audit trail ─────────────────
  select status, total into _prev_status, _prev_total
  from public.quotes where id = _quote_id;

  -- ── 1. Atualiza o orçamento ────────────────────────────────────────────────
  update public.quotes
  set
    client_id                = coalesce(nullif(_quote_patch->>'client_id', ''), client_id::text)::uuid,
    client_name              = coalesce(nullif(_quote_patch->>'client_name', ''), client_name),
    client_email             = coalesce(_quote_patch->>'client_email',     client_email),
    client_phone             = coalesce(_quote_patch->>'client_phone',     client_phone),
    client_company           = coalesce(_quote_patch->>'client_company',   client_company),
    status                   = coalesce(_quote_patch->>'status',           status),
    shipping_type            = coalesce(_quote_patch->>'shipping_type',    shipping_type),
    shipping_cost            = coalesce((_quote_patch->>'shipping_cost')::numeric,            shipping_cost),
    payment_method           = coalesce(_quote_patch->>'payment_method',   payment_method),
    payment_terms            = coalesce(_quote_patch->>'payment_terms',    payment_terms),
    delivery_time            = coalesce(_quote_patch->>'delivery_time',    delivery_time),
    notes                    = coalesce(_quote_patch->>'notes',            notes),
    internal_notes           = coalesce(_quote_patch->>'internal_notes',   internal_notes),
    discount_percent         = coalesce((_quote_patch->>'discount_percent')::numeric,         discount_percent),
    discount_amount          = coalesce((_quote_patch->>'discount_amount')::numeric,          discount_amount),
    subtotal                 = coalesce((_quote_patch->>'subtotal')::numeric,                 subtotal),
    total                    = coalesce((_quote_patch->>'total')::numeric,                    total),
    negotiation_markup_percent = coalesce((_quote_patch->>'negotiation_markup_percent')::numeric, negotiation_markup_percent),
    valid_until              = coalesce((_quote_patch->>'valid_until')::date,                 valid_until),
    updated_at               = now()
  where id = _quote_id
  returning * into _updated_quote;

  if _updated_quote is null then
    raise exception 'Orçamento não encontrado: %', _quote_id
      using errcode = 'no_data_found';
  end if;

  -- ── 2. Remove itens/personalizações existentes ────────────────────────────
  delete from public.quote_item_personalizations
  where quote_item_id in (
    select id from public.quote_items where quote_id = _quote_id
  );
  delete from public.quote_items where quote_id = _quote_id;

  -- ── 3. Reinsere itens ─────────────────────────────────────────────────────
  for _item in select value from jsonb_array_elements(coalesce(_items, '[]'::jsonb)) loop
    insert into public.quote_items (
      quote_id, product_id, product_name, product_sku, product_image_url,
      quantity, unit_price, subtotal,
      discount_percentage, discount_amount,
      color_name, color_hex, size_code, gender,
      sort_order, notes, kit_group_id, kit_name,
      price_confirmed_at, price_updated_at, price_freshness_threshold_days, bitrix_product_id
    )
    values (
      _quote_id,
      nullif(_item->>'product_id', '')::uuid,
      _item->>'product_name',
      _item->>'product_sku',
      _item->>'product_image_url',
      coalesce((_item->>'quantity')::integer, 0),
      coalesce((_item->>'unit_price')::numeric, 0),
      coalesce((_item->>'subtotal')::numeric, 0),
      coalesce((_item->>'discount_percentage')::numeric, 0),
      coalesce((_item->>'discount_amount')::numeric, 0),
      _item->>'color_name',
      _item->>'color_hex',
      nullif(_item->>'size_code', ''),
      nullif(_item->>'gender', ''),
      coalesce((_item->>'sort_order')::integer, 0),
      _item->>'notes',
      nullif(_item->>'kit_group_id', '')::uuid,
      nullif(_item->>'kit_name', ''),
      nullif(_item->>'price_confirmed_at', '')::timestamptz,
      nullif(_item->>'price_updated_at', '')::timestamptz,
      coalesce(nullif(_item->>'price_freshness_threshold_days', '')::integer, 60),
      nullif(_item->>'bitrix_product_id', '')
    )
    returning id into _new_item_id;

    -- ── 4. Reinsere personalizações ─────────────────────────────────────────
    for _pers in select value from jsonb_array_elements(coalesce(_item->'personalizations', '[]'::jsonb)) loop
      insert into public.quote_item_personalizations (
        quote_item_id, technique_id, technique_name,
        location_code, location_name,
        personalized_quantity, colors_count, positions_count,
        area_cm2, width_cm, height_cm,
        setup_cost, unit_cost, total_cost, notes
      )
      values (
        _new_item_id,
        nullif(_pers->>'technique_id', '')::uuid,
        _pers->>'technique_name',
        _pers->>'location_code',
        _pers->>'location_name',
        nullif(_pers->>'personalized_quantity', '')::integer,
        coalesce((_pers->>'colors_count')::integer, 1),
        coalesce((_pers->>'positions_count')::integer, 1),
        nullif(_pers->>'area_cm2', '')::numeric,
        nullif(_pers->>'width_cm', '')::numeric,
        nullif(_pers->>'height_cm', '')::numeric,
        coalesce((_pers->>'setup_cost')::numeric, 0),
        coalesce((_pers->>'unit_cost')::numeric, 0),
        coalesce((_pers->>'total_cost')::numeric, 0),
        _pers->>'notes'
      );
    end loop;
  end loop;

  -- ── 5. Audit trail ───────────────────────────────────────────────────────
  _actor_id := coalesce(auth.uid(), _updated_quote.seller_id);
  if _actor_id is not null then
    -- Ação diferenciada: status_changed é evento mais crítico de rastrear
    if _prev_status is distinct from _updated_quote.status then
      _action := 'status_changed';
      _desc   := format('Status alterado de "%s" para "%s" no %s',
                        _prev_status, _updated_quote.status, _updated_quote.quote_number);
    else
      _action := 'updated';
      _desc   := format('Orçamento %s editado (total: R$ %s)',
                        _updated_quote.quote_number,
                        _updated_quote.total);
    end if;

    insert into public.quote_history (quote_id, user_id, action, description, metadata)
    values (
      _quote_id,
      _actor_id,
      _action,
      _desc,
      jsonb_build_object(
        'prev_status', _prev_status,
        'new_status',  _updated_quote.status,
        'prev_total',  _prev_total,
        'new_total',   _updated_quote.total,
        'markup',      _updated_quote.negotiation_markup_percent,
        'n_items',     (select count(*) from public.quote_items where quote_id = _quote_id)
      )
    );
  end if;

  return _updated_quote;
end;
$function$;;
