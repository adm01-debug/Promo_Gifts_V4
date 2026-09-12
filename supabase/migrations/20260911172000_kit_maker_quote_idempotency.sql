-- Forward-only: idempotent quote creation for Kit Maker.
--
-- This migration is intentionally NOT applied by the repository. Apply only
-- after reconciling the remote migration ledger for doufsxqlfjyuvxuezpln.
-- It wraps the existing audited writer instead of changing its contract, so
-- other quote entry points remain untouched.

DO $precondition$
BEGIN
  IF to_regprocedure('public.create_quote_transactional(jsonb,jsonb)') IS NULL THEN
    RAISE EXCEPTION
      'Precondition failed: public.create_quote_transactional(jsonb,jsonb) is required';
  END IF;

  IF to_regclass('public.quotes') IS NULL THEN
    RAISE EXCEPTION 'Precondition failed: public.quotes is required';
  END IF;
END
$precondition$;

CREATE TABLE IF NOT EXISTS public.kit_quote_requests (
  request_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE RESTRICT,
  payload_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kit_quote_requests_payload_hash_not_empty CHECK (length(payload_hash) > 0)
);

COMMENT ON TABLE public.kit_quote_requests IS
  'Idempotency ledger for authenticated Kit Maker quote submissions.';

ALTER TABLE public.kit_quote_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kit_quote_requests_select_own ON public.kit_quote_requests;
CREATE POLICY kit_quote_requests_select_own
  ON public.kit_quote_requests
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- The wrapper function is SECURITY INVOKER and performs the insert as the
-- authenticated caller. This policy is deliberately narrow; clients never
-- need UPDATE or DELETE access to the ledger.
DROP POLICY IF EXISTS kit_quote_requests_insert_own ON public.kit_quote_requests;
CREATE POLICY kit_quote_requests_insert_own
  ON public.kit_quote_requests
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE public.kit_quote_requests FROM PUBLIC;
GRANT SELECT, INSERT ON TABLE public.kit_quote_requests TO authenticated;

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

  _payload_hash := md5(_quote::text || E'\n' || _items::text);

  -- Serializes equal request ids before the underlying writer is invoked.
  -- This closes both double-click and response-timeout retry races.
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

  INSERT INTO public.kit_quote_requests (request_id, user_id, quote_id, payload_hash)
  VALUES (_request_id, _actor_id, _quote_result.id, _payload_hash);

  RETURN _quote_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_kit_quote_transactional(uuid, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_kit_quote_transactional(uuid, jsonb, jsonb)
  TO authenticated;

COMMENT ON FUNCTION public.create_kit_quote_transactional(uuid, jsonb, jsonb) IS
  'Kit Maker idempotent wrapper around create_quote_transactional; same request id returns the original quote.';

DO $postcondition$
BEGIN
  IF to_regprocedure('public.create_kit_quote_transactional(uuid,jsonb,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'Postcondition failed: Kit Maker idempotent RPC was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class relation
    JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname = 'kit_quote_requests'
      AND relation.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: kit_quote_requests RLS is not enabled';
  END IF;
END
$postcondition$;
