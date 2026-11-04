CREATE OR REPLACE FUNCTION public.create_kit_quote_transactional(_request_id uuid, _quote jsonb, _items jsonb)
 RETURNS quotes
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  _actor_id uuid := auth.uid();
  _payload_hash text;
  _existing public.kit_quote_requests%ROWTYPE;
  _quote_result public.quotes;
  _item jsonb;
  _ordinality bigint;
  _variant_id uuid;
  _product_id uuid;
  _artwork_urls jsonb;
  _updated_count integer;
BEGIN
  IF _actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to create a Kit Maker quote'
      USING ERRCODE = '28000';
  END IF;

  IF _request_id IS NULL THEN
    RAISE EXCEPTION 'A request id is required for idempotent quote creation'
      USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(_quote) IS DISTINCT FROM 'object'
     OR jsonb_typeof(_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid quote payload'
      USING ERRCODE = '22023';
  END IF;

  IF _quote ? 'tags' AND jsonb_typeof(_quote->'tags') <> 'object' THEN
    RAISE EXCEPTION 'Kit Maker quote tags must be a JSON object'
      USING ERRCODE = '22023';
  END IF;

  _payload_hash := md5(_quote::text || E'\n' || _items::text);

  -- Serializes equal request ids before the underlying writer is invoked.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(_actor_id::text || ':' || _request_id::text, 0)
  );

  SELECT *
  INTO _existing
  FROM public.kit_quote_requests
  WHERE request_id = _request_id
    AND user_id = _actor_id;

  IF FOUND THEN
    IF _existing.payload_hash <> _payload_hash THEN
      RAISE EXCEPTION 'The request id was already used with a different payload'
        USING ERRCODE = '22023';
    END IF;

    SELECT * INTO _quote_result
    FROM public.quotes
    WHERE id = _existing.quote_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Idempotency ledger references a missing quote'
        USING ERRCODE = '23503';
    END IF;

    RETURN _quote_result;
  END IF;

  SELECT * INTO _quote_result
  FROM public.create_quote_transactional(_quote, _items);

  IF _quote ? 'tags' THEN
    UPDATE public.quotes
    SET tags = _quote->'tags'
    WHERE id = _quote_result.id;
  END IF;

  FOR _item, _ordinality IN
    SELECT value, ordinality
    FROM jsonb_array_elements(_items) WITH ORDINALITY
  LOOP
    IF _item ? 'artwork_urls' AND jsonb_typeof(_item->'artwork_urls') <> 'array' THEN
      RAISE EXCEPTION 'artwork_urls must be a JSON array'
        USING ERRCODE = '22023';
    END IF;

    _product_id := nullif(_item->>'product_id', '')::uuid;
    _variant_id := nullif(_item->>'product_variant_id', '')::uuid;
    _artwork_urls := CASE
      WHEN _item ? 'artwork_urls' THEN _item->'artwork_urls'
      ELSE '[]'::jsonb
    END;

    IF _variant_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM public.product_variants variant
      WHERE variant.id = _variant_id
        AND variant.product_id = _product_id
    ) THEN
      RAISE EXCEPTION 'Selected variant does not belong to the quoted product'
        USING ERRCODE = '23503';
    END IF;

    UPDATE public.quote_items
    SET artwork_urls = _artwork_urls,
        product_variant_id = _variant_id
    WHERE quote_id = _quote_result.id
      AND sort_order = coalesce(nullif(_item->>'sort_order', '')::integer, _ordinality::integer - 1)
      AND product_id IS NOT DISTINCT FROM _product_id;

    GET DIAGNOSTICS _updated_count = ROW_COUNT;
    IF _updated_count <> 1 THEN
      RAISE EXCEPTION 'Kit Maker quote lineage could not match exactly one quote item (sort order %, product %)',
        coalesce(nullif(_item->>'sort_order', '')::integer, _ordinality::integer - 1),
        _product_id
        USING ERRCODE = '23505';
    END IF;
  END LOOP;

  INSERT INTO public.kit_quote_requests (request_id, user_id, quote_id, payload_hash)
  VALUES (_request_id, _actor_id, _quote_result.id, _payload_hash);

  RETURN _quote_result;
END;
$function$
