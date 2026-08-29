-- Forward-only: alinha limite/seller do DAR ao responsável do orçamento e
-- restringe o fallback temporal de auditoria a registros legados sem correlação.

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
  _responsible_id uuid;
  _q public.quotes;
  _max_allowed numeric;
  _snapshot text;
  _existing public.discount_approval_requests;
  _result public.discount_approval_requests;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _q FROM public.quotes WHERE id = _quote_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orçamento não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  IF _q.seller_id IS DISTINCT FROM _uid AND _q.created_by IS DISTINCT FROM _uid THEN
    RAISE EXCEPTION 'Somente o vendedor responsável ou criador pode solicitar aprovação.'
      USING ERRCODE = '42501';
  END IF;
  IF _q.status NOT IN ('draft', 'pending', 'pending_approval') THEN
    RAISE EXCEPTION 'Status do orçamento não permite solicitar aprovação: %', _q.status
      USING ERRCODE = '23514';
  END IF;

  _responsible_id := COALESCE(_q.seller_id, _q.created_by);
  IF _responsible_id IS NULL THEN
    RAISE EXCEPTION 'Orçamento sem vendedor responsável.' USING ERRCODE = '23514';
  END IF;
  SELECT max_discount_percent INTO _max_allowed
  FROM public.seller_discount_limits WHERE user_id = _responsible_id;
  IF _max_allowed IS NULL THEN
    RAISE EXCEPTION 'Vendedor responsável sem limite de desconto cadastrado.'
      USING ERRCODE = '23514';
  END IF;
  IF COALESCE(_q.real_discount_percent, 0) <= _max_allowed THEN
    RAISE EXCEPTION 'O desconto real não excede a alçada do vendedor responsável.'
      USING ERRCODE = '23514';
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
    _result := _existing;
  ELSE
    SELECT * INTO _existing
    FROM public.discount_approval_requests dar
    WHERE dar.quote_id = _quote_id AND dar.status = 'pending'
    ORDER BY dar.created_at DESC LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      IF _existing.quote_snapshot_hash IS DISTINCT FROM _snapshot
         OR _existing.requested_discount_percent < _q.real_discount_percent
         OR _existing.seller_id IS DISTINCT FROM _responsible_id THEN
        RAISE EXCEPTION 'Já existe solicitação pendente para outro snapshot/percentual/vendedor.'
          USING ERRCODE = '23505';
      END IF;
      UPDATE public.quotes SET status = 'pending_approval'
      WHERE id = _quote_id AND status <> 'pending_approval';
      _result := _existing;
    ELSE
      INSERT INTO public.discount_approval_requests (
        quote_id, seller_id, requested_discount_percent, max_allowed_percent,
        status, seller_notes, quote_snapshot_hash
      ) VALUES (
        _quote_id, _responsible_id, _q.real_discount_percent, _max_allowed,
        'pending', NULLIF(btrim(_seller_notes), ''), _snapshot
      ) RETURNING * INTO _result;

      UPDATE public.quotes SET status = 'pending_approval' WHERE id = _quote_id;

      INSERT INTO public.quote_history (
        quote_id, user_id, action, description, field_changed, new_value, metadata
      ) VALUES (
        _quote_id, _uid, 'discount_approval_requested',
        format('Solicitação de desconto real %s%% (limite %s%%)',
          _q.real_discount_percent, _max_allowed),
        'discount', _q.real_discount_percent::text || '%',
        jsonb_build_object(
          'request_id', _result.id,
          'seller_id', _responsible_id,
          'requested_by', _uid,
          'seller_notes', NULLIF(btrim(_seller_notes), ''),
          'apparent_discount_percent', _q.discount_percent,
          'real_discount_percent', _q.real_discount_percent,
          'negotiation_markup_percent', COALESCE(_q.negotiation_markup_percent, 0),
          'max_allowed_percent', _max_allowed,
          'quote_snapshot_hash', _snapshot
        )
      );
    END IF;
  END IF;

  IF COALESCE(_q.negotiation_markup_percent, 0) > 0 THEN
    INSERT INTO public.admin_audit_log (
      user_id, action, resource_type, resource_id, request_id, source, status, details
    )
    SELECT
      _uid,
      'quote_negotiation_markup_applied',
      'quote',
      _quote_id::text,
      _result.id::text,
      'request_discount_approval_transactional',
      'success',
      jsonb_build_object(
        'approval_request_id', _result.id,
        'seller_id', _responsible_id,
        'requested_by', _uid,
        'negotiation_markup_percent', _q.negotiation_markup_percent,
        'apparent_discount_percent', _q.discount_percent,
        'real_discount_percent', _q.real_discount_percent,
        'max_allowed_percent', _max_allowed,
        'context', 'discount_approval_request'
      )
    WHERE NOT EXISTS (
      SELECT 1 FROM public.admin_audit_log aal
      WHERE aal.action = 'quote_negotiation_markup_applied'
        AND aal.resource_type = 'quote'
        AND aal.resource_id = _quote_id::text
        AND aal.details->>'context' = 'discount_approval_request'
        AND (
          aal.request_id = _result.id::text
          OR aal.details->>'approval_request_id' = _result.id::text
          OR (
            aal.request_id IS NULL
            AND NULLIF(aal.details->>'approval_request_id', '') IS NULL
            AND aal.created_at >= _result.created_at - interval '1 minute'
          )
        )
    );
  END IF;

  RETURN _result;
END;
$function$;

REVOKE ALL ON FUNCTION public.request_discount_approval_transactional(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_discount_approval_transactional(uuid, text)
  TO authenticated, service_role;

DO $post$
DECLARE
  _def text := pg_get_functiondef(
    'public.request_discount_approval_transactional(uuid,text)'::regprocedure
  );
BEGIN
  IF position('_responsible_id := COALESCE(_q.seller_id, _q.created_by)' IN _def) = 0
     OR position('aal.request_id IS NULL' IN _def) = 0
     OR position('requested_by' IN _def) = 0 THEN
    RAISE EXCEPTION 'Postcondition failed: seller/correlação de audit não persistidos';
  END IF;
END
$post$;

COMMIT;
