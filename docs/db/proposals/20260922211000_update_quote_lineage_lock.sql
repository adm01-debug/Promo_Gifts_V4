-- PROPOSTA NÃO APLICADA. Preparação/simulação autorizada em 22/09/2026.
-- Atualização diferencial: preserva IDs, campos omitidos e personalizações não tocadas.
-- Remoções exigem intenção explícita em _quote_patch._removed_item_ids.
-- Dependência: 20260922210500_increment_quote_version_explicit_bump.sql.

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
  ) THEN RAISE EXCEPTION 'update_quote_transactional: definition or privileges drift; recollect before applying'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    WHERE p.oid='public.increment_quote_version()'::regprocedure
      AND position('explicit_client_version_bump_v1' IN p.prosrc)>0
  ) THEN RAISE EXCEPTION 'increment_quote_version dependency is absent'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid='public.quote_items'::regclass
      AND conname='quote_items_product_variant_id_fkey'
      AND pg_get_constraintdef(oid)='FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE SET NULL'
  ) THEN RAISE EXCEPTION 'Variant foreign key drift'; END IF;
END;
$precondition$;

CREATE OR REPLACE FUNCTION public.update_quote_transactional(
  _quote_id uuid, _quote_patch jsonb, _items jsonb,
  _expected_version integer DEFAULT NULL::integer
) RETURNS quotes
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _updated_quote public.quotes;
  _current_version integer;
  _prev_status text;
  _prev_total numeric;
  _item jsonb;
  _pers jsonb;
  _item_id uuid;
  _actor_id uuid;
  _action text;
  _desc text;
  _variant_id uuid;
  _effective_product_id uuid;
  _existing public.quote_items%ROWTYPE;
  _seen_ids uuid[] := '{}'::uuid[];
  _removed_ids uuid[] := '{}'::uuid[];
  _matches integer;
  _selection_valid boolean;
BEGIN
  IF jsonb_typeof(coalesce(_quote_patch,'{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION '_quote_patch must be a JSON object' USING ERRCODE='22023';
  END IF;
  IF jsonb_typeof(coalesce(_items,'[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION '_items must be a JSON array' USING ERRCODE='22023';
  END IF;
  IF _quote_patch ? '_removed_item_ids' THEN
    IF jsonb_typeof(_quote_patch->'_removed_item_ids') <> 'array' THEN
      RAISE EXCEPTION '_removed_item_ids must be a JSON array' USING ERRCODE='22023';
    END IF;
    BEGIN
      SELECT coalesce(array_agg(value::text::uuid),'{}'::uuid[])
      INTO _removed_ids
      FROM jsonb_array_elements_text(_quote_patch->'_removed_item_ids');
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION '_removed_item_ids contains an invalid UUID' USING ERRCODE='22023';
    END;
    IF cardinality(_removed_ids) <> cardinality(ARRAY(SELECT DISTINCT unnest(_removed_ids))) THEN
      RAISE EXCEPTION '_removed_item_ids contains duplicates' USING ERRCODE='22023';
    END IF;
  END IF;

  SELECT version,status,total INTO _current_version,_prev_status,_prev_total
  FROM public.quotes WHERE id=_quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orçamento não encontrado: %',_quote_id USING ERRCODE='P0002'; END IF;
  IF auth.uid() IS NOT NULL AND _expected_version IS NULL THEN
    RAISE EXCEPTION '_expected_version is required for authenticated updates' USING ERRCODE='22023';
  END IF;
  IF _expected_version IS NOT NULL AND _current_version <> _expected_version THEN
    RAISE EXCEPTION 'Conflito de versão: orçamento foi modificado por outro usuário (versão atual: %, versão esperada: %). Recarregue e tente novamente.',_current_version,_expected_version USING ERRCODE='40001';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(_removed_ids) rid
    WHERE NOT EXISTS (SELECT 1 FROM public.quote_items qi WHERE qi.id=rid AND qi.quote_id=_quote_id)
  ) THEN RAISE EXCEPTION 'Removed item id does not belong to this quote' USING ERRCODE='22023'; END IF;

  UPDATE public.quotes SET
    client_id=coalesce(nullif(_quote_patch->>'client_id',''),client_id::text)::uuid,
    contact_id=CASE WHEN _quote_patch ? 'contact_id' THEN nullif(_quote_patch->>'contact_id','')::uuid ELSE contact_id END,
    client_name=coalesce(nullif(_quote_patch->>'client_name',''),client_name),
    client_email=coalesce(_quote_patch->>'client_email',client_email),
    client_phone=coalesce(_quote_patch->>'client_phone',client_phone),
    client_company=coalesce(_quote_patch->>'client_company',client_company),
    client_cnpj=coalesce(_quote_patch->>'client_cnpj',client_cnpj),
    status=coalesce(_quote_patch->>'status',status),
    shipping_type=coalesce(_quote_patch->>'shipping_type',shipping_type),
    shipping_cost=coalesce((_quote_patch->>'shipping_cost')::numeric,shipping_cost),
    payment_method=coalesce(_quote_patch->>'payment_method',payment_method),
    payment_terms=coalesce(_quote_patch->>'payment_terms',payment_terms),
    delivery_time=CASE WHEN _quote_patch ? 'delivery_time' THEN nullif(_quote_patch->>'delivery_time','') ELSE delivery_time END,
    notes=CASE WHEN _quote_patch ? 'notes' THEN _quote_patch->>'notes' ELSE notes END,
    internal_notes=CASE WHEN _quote_patch ? 'internal_notes' THEN _quote_patch->>'internal_notes' ELSE internal_notes END,
    discount_percent=coalesce((_quote_patch->>'discount_percent')::numeric,discount_percent),
    discount_amount=coalesce((_quote_patch->>'discount_amount')::numeric,discount_amount),
    subtotal=coalesce((_quote_patch->>'subtotal')::numeric,subtotal),
    total=coalesce((_quote_patch->>'total')::numeric,total),
    negotiation_markup_percent=coalesce((_quote_patch->>'negotiation_markup_percent')::numeric,negotiation_markup_percent),
    valid_until=CASE WHEN _quote_patch ? 'valid_until' THEN nullif(_quote_patch->>'valid_until','')::date ELSE valid_until END,
    updated_at=now()
  WHERE id=_quote_id RETURNING * INTO _updated_quote;

  FOR _item IN SELECT value FROM jsonb_array_elements(coalesce(_items,'[]'::jsonb)) LOOP
    IF jsonb_typeof(_item) <> 'object' THEN
      RAISE EXCEPTION 'Each quote item must be a JSON object' USING ERRCODE='22023';
    END IF;
    _existing := NULL;
    BEGIN _item_id := nullif(_item->>'id','')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'quote item id is invalid' USING ERRCODE='22023';
    END;
    IF _item_id IS NOT NULL THEN
      SELECT * INTO _existing FROM public.quote_items
      WHERE id=_item_id AND quote_id=_quote_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Item id does not belong to this quote' USING ERRCODE='22023'; END IF;
    ELSE
      SELECT count(*) INTO _matches FROM public.quote_items qi
      WHERE qi.quote_id=_quote_id
        AND qi.product_id::text IS NOT DISTINCT FROM nullif(_item->>'product_id','')
        AND qi.product_sku IS NOT DISTINCT FROM _item->>'product_sku'
        AND qi.color_name IS NOT DISTINCT FROM _item->>'color_name'
        AND qi.size_code IS NOT DISTINCT FROM nullif(_item->>'size_code','')
        AND qi.kit_group_id::text IS NOT DISTINCT FROM nullif(_item->>'kit_group_id','');
      IF _matches > 1 THEN
        RAISE EXCEPTION 'Ambiguous legacy item: send quote item id' USING ERRCODE='22023';
      ELSIF _matches=1 THEN
        SELECT * INTO _existing FROM public.quote_items qi
        WHERE qi.quote_id=_quote_id
          AND qi.product_id::text IS NOT DISTINCT FROM nullif(_item->>'product_id','')
          AND qi.product_sku IS NOT DISTINCT FROM _item->>'product_sku'
          AND qi.color_name IS NOT DISTINCT FROM _item->>'color_name'
          AND qi.size_code IS NOT DISTINCT FROM nullif(_item->>'size_code','')
          AND qi.kit_group_id::text IS NOT DISTINCT FROM nullif(_item->>'kit_group_id','') FOR UPDATE;
        _item_id := _existing.id;
      END IF;
    END IF;
    IF _item_id IS NOT NULL THEN
      IF _item_id=ANY(_seen_ids) THEN RAISE EXCEPTION 'Duplicate quote item identity' USING ERRCODE='22023'; END IF;
      IF _item_id=ANY(_removed_ids) THEN RAISE EXCEPTION 'Item cannot be retained and removed in the same request' USING ERRCODE='22023'; END IF;
      _seen_ids := array_append(_seen_ids,_item_id);
    END IF;

    _effective_product_id := CASE WHEN _item ? 'product_id' THEN nullif(_item->>'product_id','')::uuid ELSE _existing.product_id END;
    IF _existing.id IS NOT NULL AND _effective_product_id IS DISTINCT FROM _existing.product_id
       AND (NOT (_item ? 'product_variant_id') OR NOT (_item ? 'artwork_urls')) THEN
      RAISE EXCEPTION 'Changing product requires explicit variant and artwork payload' USING ERRCODE='22023';
    END IF;
    IF _item ? 'artwork_urls' THEN
      IF jsonb_typeof(_item->'artwork_urls') <> 'array' OR jsonb_array_length(_item->'artwork_urls') > 20
         OR EXISTS (SELECT 1 FROM jsonb_array_elements(_item->'artwork_urls') e
           WHERE jsonb_typeof(e)<>'string' OR length(trim(both '"' from e::text))>2048 OR trim(both '"' from e::text) ~ '[[:space:]]') THEN
        RAISE EXCEPTION 'artwork_urls must contain at most 20 safe strings' USING ERRCODE='22023';
      END IF;
    END IF;
    IF _item ? 'mockup_urls' THEN
      IF jsonb_typeof(_item->'mockup_urls') <> 'array' OR jsonb_array_length(_item->'mockup_urls') > 20
         OR EXISTS (SELECT 1 FROM jsonb_array_elements(_item->'mockup_urls') e
           WHERE jsonb_typeof(e)<>'string' OR length(trim(both '"' from e::text))>2048 OR trim(both '"' from e::text) ~ '[[:space:]]') THEN
        RAISE EXCEPTION 'mockup_urls must contain at most 20 safe strings' USING ERRCODE='22023';
      END IF;
    END IF;
    IF _item ? 'personalizations' THEN
      IF jsonb_typeof(_item->'personalizations') <> 'array' THEN RAISE EXCEPTION 'personalizations must be a JSON array' USING ERRCODE='22023'; END IF;
      IF EXISTS (SELECT 1 FROM jsonb_array_elements(_item->'personalizations') p WHERE jsonb_typeof(p)<>'object') THEN
        RAISE EXCEPTION 'Each personalization must be a JSON object' USING ERRCODE='22023';
      END IF;
    END IF;

    _variant_id := CASE WHEN _item ? 'product_variant_id' THEN nullif(_item->>'product_variant_id','')::uuid ELSE _existing.product_variant_id END;
    _selection_valid := false;
    IF _variant_id IS NOT NULL THEN
      IF _existing.id IS NULL OR _variant_id IS DISTINCT FROM _existing.product_variant_id OR _effective_product_id IS DISTINCT FROM _existing.product_id THEN
        SELECT true INTO _selection_valid FROM public.product_variants v JOIN public.products p ON p.id=v.product_id
        WHERE v.id=_variant_id AND v.product_id=_effective_product_id AND v.is_active
          AND p.is_active AND NOT coalesce(p.is_deleted,false) AND p.deleted_at IS NULL;
      ELSE
        SELECT true INTO _selection_valid FROM public.product_variants v WHERE v.id=_variant_id AND v.product_id=_effective_product_id;
      END IF;
      IF NOT coalesce(_selection_valid,false) THEN RAISE EXCEPTION 'Selected variant is inactive or does not belong to an active quoted product' USING ERRCODE='23503'; END IF;
    ELSIF _effective_product_id IS NOT NULL AND (_existing.id IS NULL OR _effective_product_id IS DISTINCT FROM _existing.product_id) THEN
      SELECT true INTO _selection_valid FROM public.products p WHERE p.id=_effective_product_id
        AND p.is_active AND NOT coalesce(p.is_deleted,false) AND p.deleted_at IS NULL;
      IF NOT coalesce(_selection_valid,false) THEN RAISE EXCEPTION 'Selected product is inactive or deleted' USING ERRCODE='23503'; END IF;
    END IF;

    IF _existing.id IS NULL THEN
      INSERT INTO public.quote_items (
        quote_id,product_id,product_name,product_description,product_sku,product_image_url,
        has_personalization,personalization_config,personalization_cost,mockup_urls,artwork_urls,
        quantity,unit_price,discount_percentage,discount_amount,subtotal,color_name,color_hex,
        size_code,gender,sort_order,notes,kit_group_id,kit_name,price_confirmed_at,price_updated_at,
        price_freshness_threshold_days,bitrix_product_id,selected_packaging_id,
        selected_packaging_name,selected_packaging_unit_cost,product_variant_id
      ) VALUES (
        _quote_id,_effective_product_id,_item->>'product_name',_item->>'product_description',
        _item->>'product_sku',_item->>'product_image_url',coalesce((_item->>'has_personalization')::boolean,false),
        _item->'personalization_config',coalesce((_item->>'personalization_cost')::numeric,0),
        coalesce(_item->'mockup_urls','[]'::jsonb),coalesce(_item->'artwork_urls','[]'::jsonb),
        coalesce((_item->>'quantity')::integer,0),coalesce((_item->>'unit_price')::numeric,0),
        coalesce((_item->>'discount_percentage')::numeric,0),coalesce((_item->>'discount_amount')::numeric,0),
        coalesce((_item->>'subtotal')::numeric,0),_item->>'color_name',_item->>'color_hex',
        nullif(_item->>'size_code',''),nullif(_item->>'gender',''),coalesce((_item->>'sort_order')::integer,0),
        _item->>'notes',nullif(_item->>'kit_group_id','')::uuid,nullif(_item->>'kit_name',''),
        nullif(_item->>'price_confirmed_at','')::timestamptz,nullif(_item->>'price_updated_at','')::timestamptz,
        coalesce(nullif(_item->>'price_freshness_threshold_days','')::integer,60),nullif(_item->>'bitrix_product_id',''),
        nullif(_item->>'selected_packaging_id','')::uuid,_item->>'selected_packaging_name',
        nullif(_item->>'selected_packaging_unit_cost','')::numeric,_variant_id
      ) RETURNING id INTO _item_id;
      _seen_ids := array_append(_seen_ids,_item_id);
    ELSE
      UPDATE public.quote_items SET
        product_id=_effective_product_id,
        product_name=CASE WHEN _item ? 'product_name' THEN _item->>'product_name' ELSE product_name END,
        product_description=CASE WHEN _item ? 'product_description' THEN _item->>'product_description' ELSE product_description END,
        product_sku=CASE WHEN _item ? 'product_sku' THEN _item->>'product_sku' ELSE product_sku END,
        product_image_url=CASE WHEN _item ? 'product_image_url' THEN _item->>'product_image_url' ELSE product_image_url END,
        has_personalization=CASE WHEN _item ? 'has_personalization' THEN (_item->>'has_personalization')::boolean ELSE has_personalization END,
        personalization_config=CASE WHEN _item ? 'personalization_config' THEN _item->'personalization_config' ELSE personalization_config END,
        personalization_cost=CASE WHEN _item ? 'personalization_cost' THEN (_item->>'personalization_cost')::numeric ELSE personalization_cost END,
        mockup_urls=CASE WHEN _item ? 'mockup_urls' THEN _item->'mockup_urls' ELSE mockup_urls END,
        artwork_urls=CASE WHEN _item ? 'artwork_urls' THEN _item->'artwork_urls' ELSE artwork_urls END,
        quantity=CASE WHEN _item ? 'quantity' THEN (_item->>'quantity')::integer ELSE quantity END,
        unit_price=CASE WHEN _item ? 'unit_price' THEN (_item->>'unit_price')::numeric ELSE unit_price END,
        discount_percentage=CASE WHEN _item ? 'discount_percentage' THEN (_item->>'discount_percentage')::numeric ELSE discount_percentage END,
        discount_amount=CASE WHEN _item ? 'discount_amount' THEN (_item->>'discount_amount')::numeric ELSE discount_amount END,
        color_name=CASE WHEN _item ? 'color_name' THEN _item->>'color_name' ELSE color_name END,
        color_hex=CASE WHEN _item ? 'color_hex' THEN _item->>'color_hex' ELSE color_hex END,
        size_code=CASE WHEN _item ? 'size_code' THEN nullif(_item->>'size_code','') ELSE size_code END,
        gender=CASE WHEN _item ? 'gender' THEN nullif(_item->>'gender','') ELSE gender END,
        sort_order=CASE WHEN _item ? 'sort_order' THEN (_item->>'sort_order')::integer ELSE sort_order END,
        notes=CASE WHEN _item ? 'notes' THEN _item->>'notes' ELSE notes END,
        kit_group_id=CASE WHEN _item ? 'kit_group_id' THEN nullif(_item->>'kit_group_id','')::uuid ELSE kit_group_id END,
        kit_name=CASE WHEN _item ? 'kit_name' THEN nullif(_item->>'kit_name','') ELSE kit_name END,
        price_confirmed_at=CASE WHEN _item ? 'price_confirmed_at' THEN nullif(_item->>'price_confirmed_at','')::timestamptz ELSE price_confirmed_at END,
        price_updated_at=CASE WHEN _item ? 'price_updated_at' THEN nullif(_item->>'price_updated_at','')::timestamptz ELSE price_updated_at END,
        price_freshness_threshold_days=CASE WHEN _item ? 'price_freshness_threshold_days' THEN nullif(_item->>'price_freshness_threshold_days','')::integer ELSE price_freshness_threshold_days END,
        bitrix_product_id=CASE WHEN _item ? 'bitrix_product_id' THEN nullif(_item->>'bitrix_product_id','') ELSE bitrix_product_id END,
        selected_packaging_id=CASE WHEN _item ? 'selected_packaging_id' THEN nullif(_item->>'selected_packaging_id','')::uuid ELSE selected_packaging_id END,
        selected_packaging_name=CASE WHEN _item ? 'selected_packaging_name' THEN _item->>'selected_packaging_name' ELSE selected_packaging_name END,
        selected_packaging_unit_cost=CASE WHEN _item ? 'selected_packaging_unit_cost' THEN nullif(_item->>'selected_packaging_unit_cost','')::numeric ELSE selected_packaging_unit_cost END,
        product_variant_id=_variant_id,updated_at=now()
      WHERE id=_item_id AND quote_id=_quote_id;
    END IF;

    IF _item ? 'personalizations' THEN
      DELETE FROM public.quote_item_personalizations WHERE quote_item_id=_item_id;
      FOR _pers IN SELECT value FROM jsonb_array_elements(_item->'personalizations') LOOP
        INSERT INTO public.quote_item_personalizations (
          quote_item_id,technique_id,technique_name,location_code,location_name,
          personalized_quantity,colors_count,positions_count,area_cm2,width_cm,height_cm,
          setup_cost,unit_cost,total_cost,notes
        ) VALUES (
          _item_id,nullif(_pers->>'technique_id','')::uuid,_pers->>'technique_name',
          _pers->>'location_code',_pers->>'location_name',nullif(_pers->>'personalized_quantity','')::integer,
          coalesce((_pers->>'colors_count')::integer,1),coalesce((_pers->>'positions_count')::integer,1),
          nullif(_pers->>'area_cm2','')::numeric,nullif(_pers->>'width_cm','')::numeric,
          nullif(_pers->>'height_cm','')::numeric,coalesce((_pers->>'setup_cost')::numeric,0),
          coalesce((_pers->>'unit_cost')::numeric,0),coalesce((_pers->>'total_cost')::numeric,0),_pers->>'notes'
        );
      END LOOP;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM public.quote_items qi WHERE qi.quote_id=_quote_id
      AND NOT (qi.id=ANY(_seen_ids)) AND NOT (qi.id=ANY(_removed_ids))
  ) THEN RAISE EXCEPTION 'Every omitted persisted item must be listed in _removed_item_ids' USING ERRCODE='22023'; END IF;
  DELETE FROM public.quote_items qi WHERE qi.quote_id=_quote_id AND qi.id=ANY(_removed_ids);

  SELECT * INTO _updated_quote FROM public.quotes WHERE id=_quote_id;
  IF _updated_quote.version=_current_version THEN
    UPDATE public.quotes SET version=_current_version+1,updated_at=now()
    WHERE id=_quote_id AND version=_current_version RETURNING * INTO _updated_quote;
    IF NOT FOUND THEN RAISE EXCEPTION 'Conflito de versão durante atualização dos itens' USING ERRCODE='40001'; END IF;
  END IF;
  IF _updated_quote.version <> _current_version+1 THEN
    RAISE EXCEPTION 'Version must advance exactly once per transaction' USING ERRCODE='40001';
  END IF;

  _actor_id := coalesce(auth.uid(),_updated_quote.seller_id);
  IF _actor_id IS NOT NULL THEN
    IF _prev_status IS DISTINCT FROM _updated_quote.status THEN
      _action := 'status_changed';
      _desc := format('Status alterado de "%s" para "%s" no %s',_prev_status,_updated_quote.status,_updated_quote.quote_number);
    ELSE
      _action := 'updated';
      _desc := format('Orçamento %s editado (total: R$ %s)',_updated_quote.quote_number,_updated_quote.total);
    END IF;
    INSERT INTO public.quote_history (quote_id,user_id,action,description,metadata)
    VALUES (_quote_id,_actor_id,_action,_desc,jsonb_build_object(
      'prev_status',_prev_status,'new_status',_updated_quote.status,'prev_total',_prev_total,
      'new_total',_updated_quote.total,'markup',_updated_quote.negotiation_markup_percent,
      'n_items',(SELECT count(*) FROM public.quote_items WHERE quote_id=_quote_id),
      'removed_item_ids',to_jsonb(_removed_ids),'optimistic_lock_used',(_expected_version IS NOT NULL)
    ));
  END IF;
  RETURN _updated_quote;
END;
$function$;

DO $postcondition$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    WHERE p.oid='public.update_quote_transactional(uuid,jsonb,jsonb,integer)'::regprocedure
      AND NOT p.prosecdef AND pg_get_userbyid(p.proowner)='postgres'
      AND p.proacl::text='{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}'
      AND p.proconfig=ARRAY['search_path=public']::text[]
      AND position('_removed_item_ids' IN p.prosrc)>0
      AND position('Version must advance exactly once' IN p.prosrc)>0
  ) THEN RAISE EXCEPTION 'update_quote_transactional: postcondition failed'; END IF;
END;
$postcondition$;
