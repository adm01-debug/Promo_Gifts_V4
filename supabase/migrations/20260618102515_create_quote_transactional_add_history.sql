-- Melhoria #2: audit trail em create_quote_transactional.
-- Problema: a criação do orçamento via RPC principal não registrava nada em quote_history,
-- tornando o audit trail dependente apenas do legado fn_create_quote_v3.
-- Solução: INSERT em quote_history após a criação, usando auth.uid() ou seller_id como fallback
-- (service_role tem auth.uid()=NULL; usamos seller_id do payload como fallback).
CREATE OR REPLACE FUNCTION public.create_quote_transactional(_quote jsonb, _items jsonb)
 RETURNS quotes
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  _new_quote    public.quotes;
  _new_quote_id uuid;
  _item         jsonb;
  _pers         jsonb;
  _new_item_id  uuid;
  _actor_id     uuid;
begin
  -- ── 1. Cria o orçamento (quote_number é preenchido pelo trigger generate_quote_number) ──
  insert into public.quotes (
    quote_number, client_id, client_name, client_email, client_phone, client_company,
    seller_id, organization_id, status,
    subtotal, discount_percent, discount_amount, total, negotiation_markup_percent,
    payment_method, payment_terms, delivery_time, shipping_type, shipping_cost,
    notes, internal_notes, valid_until
  )
  values (
    coalesce(_quote->>'quote_number', ''),
    nullif(_quote->>'client_id', '')::uuid,
    coalesce(_quote->>'client_name', ''),
    _quote->>'client_email',
    _quote->>'client_phone',
    _quote->>'client_company',
    nullif(_quote->>'seller_id', '')::uuid,
    nullif(_quote->>'organization_id', '')::uuid,
    coalesce(_quote->>'status', 'draft'),
    coalesce((_quote->>'subtotal')::numeric, 0),
    coalesce((_quote->>'discount_percent')::numeric, 0),
    coalesce((_quote->>'discount_amount')::numeric, 0),
    coalesce((_quote->>'total')::numeric, 0),
    coalesce((_quote->>'negotiation_markup_percent')::numeric, 0),
    _quote->>'payment_method',
    _quote->>'payment_terms',
    _quote->>'delivery_time',
    _quote->>'shipping_type',
    coalesce((_quote->>'shipping_cost')::numeric, 0),
    _quote->>'notes',
    _quote->>'internal_notes',
    nullif(_quote->>'valid_until', '')::date
  )
  returning * into _new_quote;

  _new_quote_id := _new_quote.id;

  -- ── 2. Insere itens ───────────────────────────────────────────────────────
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
      _new_quote_id,
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

    -- ── 3. Insere personalizações do item ────────────────────────────────────
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

  -- ── 4. Relê a linha final (quote_number gerado + totais recalculados pelos triggers) ──
  select * into _new_quote from public.quotes where id = _new_quote_id;

  -- ── 5. Audit trail ───────────────────────────────────────────────────────
  -- auth.uid() é NULL em contexto service_role; usa seller_id do payload como fallback.
  _actor_id := coalesce(auth.uid(), nullif(_quote->>'seller_id','')::uuid);
  if _actor_id is not null then
    insert into public.quote_history (quote_id, user_id, action, description, metadata)
    values (
      _new_quote_id,
      _actor_id,
      'created',
      format('Orçamento %s criado com %s item(s) via RPC',
             _new_quote.quote_number,
             (select count(*) from public.quote_items where quote_id = _new_quote_id)),
      jsonb_build_object(
        'status',    _new_quote.status,
        'subtotal',  _new_quote.subtotal,
        'total',     _new_quote.total,
        'markup',    _new_quote.negotiation_markup_percent,
        'n_items',   (select count(*) from public.quote_items where quote_id = _new_quote_id)
      )
    );
  end if;

  return _new_quote;
end;
$function$;;
