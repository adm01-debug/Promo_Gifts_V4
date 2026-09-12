-- Forward-only Kit Maker quote lineage.
--
-- Persists the selected variant, approved artwork references and Kit Maker
-- context in the *idempotent Kit Maker wrapper*.  The generic quote writer is
-- deliberately left untouched: other quote entry points retain their audited
-- contract while this path gains the metadata its UI actually sends.
--
-- Apply only after checking the live function definition below.  Every
-- precondition fails closed if another agent has updated this contract.

DO $precondition$
DECLARE
  _definition text;
BEGIN
  IF to_regprocedure('public.create_kit_quote_transactional(uuid,jsonb,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'Precondition failed: create_kit_quote_transactional(uuid,jsonb,jsonb) is required';
  END IF;
  IF to_regprocedure('public.create_quote_transactional(jsonb,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'Precondition failed: create_quote_transactional(jsonb,jsonb) is required';
  END IF;
  IF to_regclass('public.quote_items') IS NULL
     OR to_regclass('public.quotes') IS NULL
     OR to_regclass('public.product_variants') IS NULL THEN
    RAISE EXCEPTION 'Precondition failed: quote_items, quotes and product_variants are required';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'quote_items' AND column_name = 'artwork_urls'
  ) OR NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'quotes' AND column_name = 'tags'
  ) THEN
    RAISE EXCEPTION 'Precondition failed: expected quote metadata columns are missing';
  END IF;

  SELECT pg_get_functiondef('public.create_kit_quote_transactional(uuid,jsonb,jsonb)'::regprocedure)
  INTO _definition;
  IF strpos(_definition, 'public.create_quote_transactional(_quote, _items)') = 0
     OR strpos(_definition, 'kit_quote_requests') = 0
     OR strpos(_definition, 'payload_hash') = 0
     OR strpos(_definition, 'product_variant_id') > 0 THEN
    RAISE EXCEPTION 'Precondition failed: Kit Maker quote wrapper drifted; re-audit before replacing it';
  END IF;
END
$precondition$;

ALTER TABLE public.quote_items
  ADD COLUMN IF NOT EXISTS product_variant_id uuid;

DO $foreign_key$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.quote_items'::regclass
      AND conname = 'quote_items_product_variant_id_fkey'
  ) THEN
    ALTER TABLE public.quote_items
      ADD CONSTRAINT quote_items_product_variant_id_fkey
      FOREIGN KEY (product_variant_id)
      REFERENCES public.product_variants(id)
      ON DELETE SET NULL;
  END IF;
END
$foreign_key$;

CREATE INDEX IF NOT EXISTS idx_quote_items_product_variant_id
  ON public.quote_items (product_variant_id);

CREATE OR REPLACE FUNCTION public.create_kit_quote_transactional(
  _request_id uuid,
  _quote jsonb,
  _items jsonb
)
RETURNS public.quotes
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
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
$function$;

REVOKE ALL ON FUNCTION public.create_kit_quote_transactional(uuid, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_kit_quote_transactional(uuid, jsonb, jsonb)
  TO authenticated;

COMMENT ON FUNCTION public.create_kit_quote_transactional(uuid, jsonb, jsonb) IS
  'Idempotent Kit Maker quote writer; persists Kit context, artwork URLs and the selected catalog variant.';

DO $postcondition$
DECLARE
  _definition text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'quote_items' AND column_name = 'product_variant_id'
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: quote_items.product_variant_id was not created';
  END IF;

  SELECT pg_get_functiondef('public.create_kit_quote_transactional(uuid,jsonb,jsonb)'::regprocedure)
  INTO _definition;
  IF strpos(_definition, 'artwork_urls') = 0
     OR strpos(_definition, 'product_variant_id') = 0
     OR strpos(_definition, 'SET tags = _quote') = 0
     OR NOT has_function_privilege(
       'authenticated',
       'public.create_kit_quote_transactional(uuid,jsonb,jsonb)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'Postcondition failed: Kit Maker quote lineage contract is incomplete';
  END IF;
END
$postcondition$;
