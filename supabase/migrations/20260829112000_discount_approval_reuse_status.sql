-- Forward-only: uma aprovação válida reutilizada deve também retirar o
-- orçamento da fila pending_approval. A versão anterior retornava o DAR sem
-- reconciliar o status da quote.

BEGIN;

CREATE OR REPLACE FUNCTION public.request_discount_approval_transactional(
  _quote_id uuid,
  _seller_notes text DEFAULT NULL
)
RETURNS public.discount_approval_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _q public.quotes;
  _max_allowed numeric;
  _snapshot text;
  _existing public.discount_approval_requests;
  _created public.discount_approval_requests;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _q FROM public.quotes WHERE id = _quote_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orçamento não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  IF _q.seller_id IS DISTINCT FROM _uid AND _q.created_by IS DISTINCT FROM _uid THEN
    RAISE EXCEPTION 'Somente o vendedor responsável pode solicitar aprovação.'
      USING ERRCODE = '42501';
  END IF;
  IF _q.status NOT IN ('draft', 'pending', 'pending_approval') THEN
    RAISE EXCEPTION 'Status do orçamento não permite solicitar aprovação: %', _q.status
      USING ERRCODE = '23514';
  END IF;

  SELECT max_discount_percent INTO _max_allowed
  FROM public.seller_discount_limits WHERE user_id = _uid;
  IF _max_allowed IS NULL THEN
    RAISE EXCEPTION 'Vendedor sem limite de desconto cadastrado.' USING ERRCODE = '23514';
  END IF;
  IF COALESCE(_q.real_discount_percent, 0) <= _max_allowed THEN
    RAISE EXCEPTION 'O desconto real não excede a alçada do vendedor.' USING ERRCODE = '23514';
  END IF;

  _snapshot := public.compute_quote_snapshot_hash(_quote_id);

  SELECT * INTO _existing
  FROM public.discount_approval_requests dar
  WHERE dar.quote_id = _quote_id
    AND dar.status = 'approved'
    AND (dar.valid_until IS NULL OR dar.valid_until > now())
    AND dar.requested_discount_percent >= _q.real_discount_percent
    AND dar.quote_snapshot_hash = _snapshot
  ORDER BY dar.responded_at DESC NULLS LAST, dar.created_at DESC
  LIMIT 1;
  IF FOUND THEN
    UPDATE public.quotes SET status = 'pending'
    WHERE id = _quote_id AND status <> 'pending';
    RETURN _existing;
  END IF;

  SELECT * INTO _existing
  FROM public.discount_approval_requests dar
  WHERE dar.quote_id = _quote_id AND dar.status = 'pending'
  ORDER BY dar.created_at DESC LIMIT 1
  FOR UPDATE;
  IF FOUND THEN
    IF _existing.quote_snapshot_hash = _snapshot
       AND _existing.requested_discount_percent >= _q.real_discount_percent THEN
      RETURN _existing;
    END IF;
    RAISE EXCEPTION 'Já existe solicitação pendente para outro snapshot/percentual.'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.discount_approval_requests (
    quote_id, seller_id, requested_discount_percent, max_allowed_percent,
    status, seller_notes, quote_snapshot_hash
  ) VALUES (
    _quote_id, _uid, _q.real_discount_percent, _max_allowed,
    'pending', NULLIF(btrim(_seller_notes), ''), _snapshot
  ) RETURNING * INTO _created;

  UPDATE public.quotes SET status = 'pending_approval' WHERE id = _quote_id;

  INSERT INTO public.quote_history (
    quote_id, user_id, action, description, field_changed, new_value, metadata
  ) VALUES (
    _quote_id, _uid, 'discount_approval_requested',
    format('Solicitação de desconto real %s%% (limite %s%%)',
      _q.real_discount_percent, _max_allowed),
    'discount', _q.real_discount_percent::text || '%',
    jsonb_build_object(
      'request_id', _created.id,
      'seller_notes', NULLIF(btrim(_seller_notes), ''),
      'real_discount_percent', _q.real_discount_percent,
      'max_allowed_percent', _max_allowed,
      'quote_snapshot_hash', _snapshot
    )
  );

  RETURN _created;
END;
$function$;

REVOKE ALL ON FUNCTION public.request_discount_approval_transactional(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_discount_approval_transactional(uuid, text)
  TO authenticated, service_role;

DO $post$
BEGIN
  IF position(
    'UPDATE public.quotes SET status = ''pending''' IN
    pg_get_functiondef('public.request_discount_approval_transactional(uuid,text)'::regprocedure)
  ) = 0 THEN
    RAISE EXCEPTION 'Postcondition failed: status não reconciliado ao reutilizar aprovação';
  END IF;
END
$post$;

COMMIT;
