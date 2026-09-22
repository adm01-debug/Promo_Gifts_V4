-- PROPOSTA NÃO APLICADA. Preparação/simulação autorizada em 22/09/2026.
-- Uma função por arquivo; fora de supabase/migrations. SEM alteração de grants/schema.
-- Executar somente após aprovação do SQL final, em transação única (psql --single-transaction).
-- Guardada, NÃO reentrante: rejeita reaplicação ou drift.
-- Rollback operacional: nova migration compensatória revisada com definição capturada,
-- NÃO rollback de dados nem reedição de migration histórica.
-- BLOQUEADA PARA RELEASE: versionamento só-de-itens e remoção protegida requerem decisão.

DO $precondition$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    WHERE p.oid=to_regprocedure('public.update_quote_transactional(uuid,jsonb,jsonb,integer)')
      AND md5(p.prosrc)='2f716e5ee22dd3de4043feb5bedc6387'
      AND NOT p.prosecdef
      AND pg_get_userbyid(p.proowner)='postgres'
      AND p.proacl::text='{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}'
      AND p.proconfig=ARRAY['search_path=public']::text[]
  ) THEN
    RAISE EXCEPTION 'update_quote_transactional: definition or privileges drift; recollect before applying';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute
    WHERE attrelid='public.quote_items'::regclass AND attname='product_variant_id'
      AND atttypid='uuid'::regtype AND NOT attnotnull AND NOT attisdropped
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute
    WHERE attrelid='public.quote_items'::regclass AND attname='artwork_urls'
      AND atttypid='jsonb'::regtype AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'quote_items lineage columns do not match reviewed schema';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid='public.quote_items'::regclass AND conname='quote_items_product_variant_id_fkey'
      AND pg_get_constraintdef(oid)='FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE SET NULL'
  ) THEN RAISE EXCEPTION 'Variant foreign key drift'; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE contype='f' AND confrelid='public.quote_items'::regclass
      AND conrelid <> 'public.quote_item_personalizations'::regclass
  ) THEN RAISE EXCEPTION 'New quote item dependents: review replacement strategy'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid='public.quotes'::regclass AND tgname='trg_quotes_version'
      AND tgfoid='public.increment_quote_version()'::regprocedure AND tgenabled IN ('O','A')
  ) THEN RAISE EXCEPTION 'Version trigger missing or disabled'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc
    WHERE oid='public.increment_quote_version()'::regprocedure
      AND md5(prosrc)='8dc69376bb204fa774c7b193a7bbce4f'
  ) THEN RAISE EXCEPTION 'Version function drift: revise this blocked candidate'; END IF;

END;
$precondition$;

CREATE OR REPLACE FUNCTION public.update_quote_transactional(_quote_id uuid, _quote_patch jsonb, _items jsonb, _expected_version integer DEFAULT NULL::integer)
 RETURNS quotes
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _updated_quote   public.quotes;
  _current_version integer;
  _prev_status     text;
  _prev_total      numeric;
  _item            jsonb;
  _pers            jsonb;
  _new_item_id     uuid;
  _actor_id        uuid;
  _action          text;
  _desc            text;
  _variant_id      uuid;
  _old_item        jsonb;
  _old_items       jsonb;
  _normalized      jsonb := '[]'::jsonb;
  _seen_ids        uuid[] := '{}'::uuid[];
  _matches         integer;
  _matched_id      uuid;
BEGIN
  IF jsonb_typeof(coalesce(_items, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION '_items must be a JSON array' USING ERRCODE = '22023';
  END IF;
  SELECT version, status, total
  INTO _current_version, _prev_status, _prev_total
  FROM public.quotes WHERE id = _quote_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orçamento não encontrado: %', _quote_id USING ERRCODE = 'P0002';
  END IF;

  IF _expected_version IS NOT NULL THEN
    IF _current_version IS NULL THEN
      RAISE EXCEPTION 'Orçamento não encontrado: %', _quote_id
        USING errcode = 'no_data_found';
    END IF;
    IF _current_version <> _expected_version THEN
      RAISE EXCEPTION
        'Conflito de versão: orçamento foi modificado por outro usuário (versão atual: %, versão esperada: %). Recarregue e tente novamente.',
        _current_version, _expected_version
        USING errcode = '40001';
    END IF;
  END IF;

  -- Snapshot local sob lock do orçamento, antes de excluir qualquer linha.
  SELECT coalesce(jsonb_agg(to_jsonb(qi)), '[]'::jsonb) INTO _old_items
  FROM public.quote_items qi WHERE qi.quote_id = _quote_id;

  FOR _item IN SELECT value FROM jsonb_array_elements(coalesce(_items, '[]'::jsonb)) LOOP
    IF jsonb_typeof(_item) <> 'object' THEN
      RAISE EXCEPTION 'Each quote item must be a JSON object' USING ERRCODE = '22023';
    END IF;
    _old_item := NULL;
    _matched_id := nullif(_item->>'id', '')::uuid;
    IF _matched_id IS NOT NULL THEN
      SELECT value INTO _old_item FROM jsonb_array_elements(_old_items)
      WHERE (value->>'id')::uuid = _matched_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Item id does not belong to this quote' USING ERRCODE = '22023';
      END IF;
    ELSE
      -- Compatibilidade com callers antigos sem id: somente match exato e único.
      -- Não usa posição, quantidade ou preço, que podem mudar na edição.
      SELECT count(*) INTO _matches FROM jsonb_array_elements(_old_items) old
      WHERE old->>'product_id' IS NOT DISTINCT FROM nullif(_item->>'product_id', '')
        AND old->>'product_sku' IS NOT DISTINCT FROM _item->>'product_sku'
        AND old->>'color_name' IS NOT DISTINCT FROM _item->>'color_name'
        AND old->>'size_code' IS NOT DISTINCT FROM nullif(_item->>'size_code', '')
        AND old->>'kit_group_id' IS NOT DISTINCT FROM nullif(_item->>'kit_group_id', '');
      IF _matches > 1 THEN
        RAISE EXCEPTION 'Ambiguous legacy item: send quote item id' USING ERRCODE = '22023';
      ELSIF _matches = 1 THEN
        SELECT value INTO _old_item FROM jsonb_array_elements(_old_items)
        WHERE value->>'product_id' IS NOT DISTINCT FROM nullif(_item->>'product_id', '')
          AND value->>'product_sku' IS NOT DISTINCT FROM _item->>'product_sku'
          AND value->>'color_name' IS NOT DISTINCT FROM _item->>'color_name'
          AND value->>'size_code' IS NOT DISTINCT FROM nullif(_item->>'size_code', '')
          AND value->>'kit_group_id' IS NOT DISTINCT FROM nullif(_item->>'kit_group_id', '');
        _matched_id := (_old_item->>'id')::uuid;
      END IF;
    END IF;
    IF _matched_id = ANY(_seen_ids) THEN
      RAISE EXCEPTION 'Duplicate quote item identity' USING ERRCODE = '22023';
    END IF;
    IF _matched_id IS NOT NULL THEN _seen_ids := array_append(_seen_ids, _matched_id); END IF;

    IF _old_item IS NOT NULL THEN
      IF _old_item->>'product_id' IS DISTINCT FROM nullif(_item->>'product_id', '')
        AND (NOT (_item ? 'product_variant_id') OR NOT (_item ? 'artwork_urls')) THEN
        RAISE EXCEPTION 'Changing product requires explicit variant and artwork payload'
          USING ERRCODE = '22023';
      END IF;
      IF NOT (_item ? 'product_variant_id') THEN
        _item := _item || jsonb_build_object('product_variant_id', _old_item->'product_variant_id');
      ELSIF _old_item->>'product_variant_id' IS NOT NULL
        AND nullif(_item->>'product_variant_id', '') IS NULL
        AND nullif(_item->>'id', '') IS NULL THEN
        RAISE EXCEPTION 'Clearing variant requires quote item id' USING ERRCODE = '22023';
      END IF;
      IF NOT (_item ? 'artwork_urls') THEN
        _item := _item || jsonb_build_object('artwork_urls', coalesce(nullif(_old_item->'artwork_urls', 'null'::jsonb), '[]'::jsonb));
      END IF;
    END IF;

    -- GUARD: identidade explícita; nunca inferir variante por SKU/cor.
    _variant_id := nullif(_item->>'product_variant_id', '')::uuid;
    IF _variant_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.product_variants v
      WHERE v.id = _variant_id
        AND v.product_id = nullif(_item->>'product_id', '')::uuid
    ) THEN
      RAISE EXCEPTION 'Selected variant does not belong to the quoted product'
        USING ERRCODE = '23503';
    END IF;
    IF _item ? 'artwork_urls' AND jsonb_typeof(_item->'artwork_urls') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'artwork_urls must be a JSON array (use [] to clear)'
        USING ERRCODE = '22023';
    END IF;

    _normalized := _normalized || jsonb_build_array(_item);
  END LOOP;

  -- Um caller sem identidade não pode apagar implicitamente linhagem protegida.
  -- Para remover tais linhas, atualizar o consumidor com id e intenção explícita.
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(_old_items) old
    WHERE NOT ((old->>'id')::uuid = ANY(_seen_ids))
      AND (old->>'product_variant_id' IS NOT NULL
        OR coalesce(nullif(old->'artwork_urls', 'null'::jsonb), '[]'::jsonb) <> '[]'::jsonb)
  ) THEN
    RAISE EXCEPTION 'Protected quote item removal requires a reviewed explicit removal contract'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.quotes
  SET
    client_id                  = coalesce(nullif(_quote_patch->>'client_id', ''), client_id::text)::uuid,
    contact_id                 = CASE WHEN _quote_patch ? 'contact_id'
                                      THEN nullif(_quote_patch->>'contact_id', '')::uuid
                                      ELSE contact_id END,
    client_name                = coalesce(nullif(_quote_patch->>'client_name', ''), client_name),
    client_email               = coalesce(_quote_patch->>'client_email',   client_email),
    client_phone               = coalesce(_quote_patch->>'client_phone',   client_phone),
    client_company             = coalesce(_quote_patch->>'client_company', client_company),
    client_cnpj                = coalesce(_quote_patch->>'client_cnpj',   client_cnpj),
    status                     = coalesce(_quote_patch->>'status',           status),
    shipping_type              = coalesce(_quote_patch->>'shipping_type',    shipping_type),
    shipping_cost              = coalesce((_quote_patch->>'shipping_cost')::numeric,              shipping_cost),
    payment_method             = coalesce(_quote_patch->>'payment_method',   payment_method),
    payment_terms              = coalesce(_quote_patch->>'payment_terms',    payment_terms),
    delivery_time              = CASE WHEN _quote_patch ? 'delivery_time'   -- FIX: nullable clearable
                                      THEN nullif(_quote_patch->>'delivery_time', '')
                                      ELSE delivery_time END,
    notes                      = CASE WHEN _quote_patch ? 'notes'
                                      THEN _quote_patch->>'notes'
                                      ELSE notes END,
    internal_notes             = CASE WHEN _quote_patch ? 'internal_notes'
                                      THEN _quote_patch->>'internal_notes'
                                      ELSE internal_notes END,
    discount_percent           = coalesce((_quote_patch->>'discount_percent')::numeric,           discount_percent),
    discount_amount            = coalesce((_quote_patch->>'discount_amount')::numeric,            discount_amount),
    subtotal                   = coalesce((_quote_patch->>'subtotal')::numeric,                   subtotal),
    total                      = coalesce((_quote_patch->>'total')::numeric,                      total),
    negotiation_markup_percent = coalesce((_quote_patch->>'negotiation_markup_percent')::numeric, negotiation_markup_percent),
    valid_until                = CASE WHEN _quote_patch ? 'valid_until'
                                      THEN nullif(_quote_patch->>'valid_until', '')::date
                                      ELSE valid_until END,
    updated_at                 = now()
  WHERE id = _quote_id
  RETURNING * INTO _updated_quote;

  IF _updated_quote IS NULL THEN
    RAISE EXCEPTION 'Orçamento não encontrado: %', _quote_id
      USING errcode = 'no_data_found';
  END IF;

  DELETE FROM public.quote_item_personalizations
  WHERE quote_item_id IN (
    SELECT id FROM public.quote_items WHERE quote_id = _quote_id
  );
  DELETE FROM public.quote_items WHERE quote_id = _quote_id;

  FOR _item IN SELECT value FROM jsonb_array_elements(_normalized) LOOP
    INSERT INTO public.quote_items (
      quote_id, product_id, product_name, product_sku, product_image_url,
      quantity, unit_price, subtotal,
      discount_percentage, discount_amount,
      color_name, color_hex, size_code, gender,
      sort_order, notes, kit_group_id, kit_name,
      price_confirmed_at, price_updated_at, price_freshness_threshold_days, bitrix_product_id,
      personalization_cost, product_variant_id, artwork_urls  -- FIX BUG-DB-01
    )
    VALUES (
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
      nullif(_item->>'bitrix_product_id', ''),
      coalesce((_item->>'personalization_cost')::numeric, 0),  -- FIX BUG-DB-01
      nullif(_item->>'product_variant_id', '')::uuid,
      coalesce(_item->'artwork_urls', '[]'::jsonb)
    )
    RETURNING id INTO _new_item_id;

    FOR _pers IN SELECT value FROM jsonb_array_elements(coalesce(_item->'personalizations', '[]'::jsonb)) LOOP
      INSERT INTO public.quote_item_personalizations (
        quote_item_id, technique_id, technique_name,
        location_code, location_name,
        personalized_quantity, colors_count, positions_count,
        area_cm2, width_cm, height_cm,
        setup_cost, unit_cost, total_cost, notes
      )
      VALUES (
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
    END LOOP;
  END LOOP;

  -- Recolher valores finais calculados pelos triggers, não o snapshot pré-itens.
  SELECT * INTO _updated_quote FROM public.quotes WHERE id = _quote_id;
  -- GUARD: o trigger atual NÃO avança versão em edição só de itens.
  -- Falhar com rollback é preferível a aceitar sobrescrita invisível.
  -- CANDIDATA BLOQUEADA PARA RELEASE até contrato de versionamento ser aprovado.
  IF _expected_version IS NOT NULL AND _updated_quote.version <= _current_version THEN
    RAISE EXCEPTION 'Item-only update cannot advance version with the current trigger; release blocked'
      USING ERRCODE = '40001';
  END IF;

  _actor_id := coalesce(auth.uid(), _updated_quote.seller_id);
  IF _actor_id IS NOT NULL THEN
    IF _prev_status IS DISTINCT FROM _updated_quote.status THEN
      _action := 'status_changed';
      _desc   := format('Status alterado de "%s" para "%s" no %s',
                        _prev_status, _updated_quote.status, _updated_quote.quote_number);
    ELSE
      _action := 'updated';
      _desc   := format('Orçamento %s editado (total: R$ %s)',
                        _updated_quote.quote_number,
                        _updated_quote.total);
    END IF;

    INSERT INTO public.quote_history (quote_id, user_id, action, description, metadata)
    VALUES (
      _quote_id,
      _actor_id,
      _action,
      _desc,
      jsonb_build_object(
        'prev_status',          _prev_status,
        'new_status',           _updated_quote.status,
        'prev_total',           _prev_total,
        'new_total',            _updated_quote.total,
        'markup',               _updated_quote.negotiation_markup_percent,
        'n_items',              (SELECT count(*) FROM public.quote_items WHERE quote_id = _quote_id),
        'optimistic_lock_used', (_expected_version IS NOT NULL)
      )
    );
  END IF;

  RETURN _updated_quote;
END;
$function$
;
DO $postcondition$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    WHERE p.oid='public.update_quote_transactional(uuid,jsonb,jsonb,integer)'::regprocedure
      AND NOT p.prosecdef AND pg_get_userbyid(p.proowner)='postgres'
      AND p.proacl::text='{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}'
      AND p.proconfig=ARRAY['search_path=public']::text[]
      AND position('product_variant_id' IN p.prosrc)>0
      AND position('artwork_urls' IN p.prosrc)>0
  ) THEN RAISE EXCEPTION 'update_quote_transactional: postcondition failed'; END IF;
END;
$postcondition$;
