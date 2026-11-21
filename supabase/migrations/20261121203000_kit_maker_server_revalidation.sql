-- KM2-099: Servidor revalida peso e encaixe físico do Kit Maker quote.
--
-- Gap de segurança: a RPC create_kit_quote_transactional criava o orçamento
-- sem reconferir peso nem encaixe físico no servidor. O front valida, mas um
-- cliente que chamasse a RPC direto gravava um kit que fisicamente não fecha.
--
-- Aplicação idempotente via CREATE OR REPLACE — risco zero de estrutura.
-- Fontes canônicas espelhadas do front:
--   * Encaixe: fn_check_item_fits (FT-088), mesmo loop sequencial acumulando
--     litros de validateKitFitsForQuote (fail-open p/ item sem dimensão).
--   * Peso: products.weight_g (> 0 = conhecido) e carga útil da caixa
--     products.box_weight_kg (D1 #3965, maxWeight = kg*1000).
---- Rollback: supabase/rollbacks/20261121203000_rollback.sql

DO $precondition$
DECLARE
  _definition text;
BEGIN
  IF to_regprocedure('public.create_kit_quote_transactional(uuid,jsonb,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'Precondition failed: create_kit_quote_transactional(uuid,jsonb,jsonb) is required';
  END IF;
  IF to_regprocedure('public.fn_check_item_fits(uuid,uuid,numeric)') IS NULL THEN
    RAISE EXCEPTION 'Precondition failed: fn_check_item_fits(uuid,uuid,numeric) is required';
  END IF;

  SELECT pg_get_functiondef('public.create_kit_quote_transactional(uuid,jsonb,jsonb)'::regprocedure)
  INTO _definition;
  IF strpos(_definition, 'create_quote_transactional(_quote, _items)') = 0
     OR strpos(_definition, 'KM2-099') > 0 THEN
    RAISE EXCEPTION 'Precondition failed: wrapper already drifted or already revalidated; re-audit before replacing it';
  END IF;
END
$precondition$;

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
  -- KM2-099: revalidação servidor
  _box_id uuid;
  _box_max_weight_kg numeric;
  _items_weight_g bigint := 0;
  _item_weight_g integer;
  _used_liters numeric := 0;
  _fit record;
  _line_volume numeric;
  _line_product_id uuid;
  _line_name text;
  _line_qty integer;
  _violations text[] := '{}';
  _it jsonb;
  _idx integer;
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

  -- ------------------------------------------------------------------
  -- KM2-099: revalidação física do kit montado.
  -- A caixa entra como linha com product_type='packaging' (sort_order=0 no
  -- front); os itens vêm em seguida. Espelha a semântica de peso
  -- (summarizeKitWeight) e de encaixe (validateKitFitsForQuote) que o
  -- front aplica antes de chamar a RPC.
  -- ------------------------------------------------------------------

  -- 1) Identifica a caixa (primeira linha packaging) e sua carga útil.
  SELECT p.id, p.box_weight_kg
    INTO _box_id, _box_max_weight_kg
    FROM jsonb_array_elements(_items) AS j(item)
    JOIN public.products p ON p.id = nullif(j.item->>'product_id','')::uuid
   WHERE p.product_type = 'packaging'
   ORDER BY coalesce(nullif(j.item->>'sort_order','')::integer, 0)
   LIMIT 1;

  -- 2) Acumula peso e encaixe linha a linha, na ordem do payload.
  FOR _it, _idx IN
    SELECT value, ordinality
    FROM jsonb_array_elements(_items) WITH ORDINALITY
  LOOP
    _line_product_id := nullif(_it->>'product_id','')::uuid;
    _line_name := coalesce(_it->>'product_name','Item');
    _line_qty := greatest(1, coalesce(nullif(_it->>'quantity','')::integer, 1));
    IF _line_product_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Peso: a caixa é o limite, não soma. Só soma peso conhecido (>0).
    IF _line_product_id IS DISTINCT FROM _box_id THEN
      SELECT max(p.weight_g)
        INTO _item_weight_g
        FROM public.products p
       WHERE p.id = _line_product_id;
      IF _item_weight_g IS NOT NULL AND _item_weight_g > 0 THEN
        _items_weight_g := _items_weight_g + (_item_weight_g::bigint * _line_qty::bigint);
      END IF;
    END IF;

    -- Encaixe: mesmo loop sequencial do cliente; falha comprovada bloqueia.
    IF _box_id IS NOT NULL AND _line_product_id IS DISTINCT FROM _box_id THEN
      SELECT * INTO _fit
        FROM public.fn_check_item_fits(_box_id, _line_product_id, _used_liters);
      _line_volume := coalesce(_fit.product_volume, 0) * _line_qty;
      IF _fit.fits = FALSE
         OR (_line_qty > 1 AND _fit.fits IS NOT NULL
             AND (_used_liters + _line_volume) > coalesce(_fit.packaging_volume, 0)) THEN
        _violations := array_append(_violations,
          format('%s (cabe: %s, volume: %sL)',
                 _line_name,
                 coalesce(_fit.fits::text, 'sem dados'),
                 round(coalesce(_line_volume,0), 2)));
      END IF;
      _used_liters := _used_liters + _line_volume;
    END IF;
  END LOOP;

  -- Violação comprovada de encaixe: rejeita (fail-closed p/ violação
  -- determinística; dados ausentes seguem fail-open como no front).
  IF _box_id IS NOT NULL AND cardinality(_violations) > 0 THEN
    RAISE EXCEPTION 'Kit nao cabe fisicamente na embalagem selecionada (KM2-099): %',
      array_to_string(_violations, '; ')
      USING ERRCODE = 'P0001';
  END IF;

  -- Sobrepeso comprovado (maxWeight = box_weight_kg*1000, mesma regra do front).
  IF _box_max_weight_kg IS NOT NULL
     AND _items_weight_g > floor(_box_max_weight_kg * 1000)::bigint THEN
    RAISE EXCEPTION 'Peso dos itens (% kg) excede a carga util da caixa (% kg) (KM2-099)',
      round(_items_weight_g / 1000.0, 1), round(_box_max_weight_kg, 1)
      USING ERRCODE = 'P0001';
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
      AND sort_order = coalesce(nullif(_item->>'sort_order','')::integer, _ordinality::integer - 1)
      AND product_id IS NOT DISTINCT FROM _product_id;

    GET DIAGNOSTICS _updated_count = ROW_COUNT;
    IF _updated_count <> 1 THEN
      RAISE EXCEPTION 'Kit Maker quote lineage could not match exactly one quote item (sort order %, product %)',
        coalesce(nullif(_item->>'sort_order','')::integer, _ordinality::integer - 1),
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
  'Idempotent Kit Maker quote writer; persists Kit context, artwork URLs, the selected catalog variant and revalidates weight/fit server-side (KM2-099).';

DO $postcondition$
DECLARE
  _definition text;
BEGIN
  SELECT pg_get_functiondef('public.create_kit_quote_transactional(uuid,jsonb,jsonb)'::regprocedure)
  INTO _definition;
  IF strpos(_definition, 'fn_check_item_fits') = 0
     OR strpos(_definition, 'box_weight_kg') = 0
     OR strpos(_definition, 'KM2-099') = 0
     OR NOT has_function_privilege(
       'authenticated',
       'public.create_kit_quote_transactional(uuid,jsonb,jsonb)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'Postcondition failed: server revalidation contract is incomplete';
  END IF;
END
$postcondition$;