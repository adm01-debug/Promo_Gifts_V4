-- Aprovação de desconto transacional, idempotente e com validação diferida do
-- snapshot final. Não cria nem remove tabelas.

BEGIN;

DO $pre$
BEGIN
  IF to_regclass('public.quotes') IS NULL
     OR to_regclass('public.discount_approval_requests') IS NULL
     OR to_regclass('public.seller_discount_limits') IS NULL
     OR to_regprocedure('public.compute_quote_snapshot_hash(uuid)') IS NULL
     OR to_regprocedure('public.is_supervisor_or_above(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Precondition failed: dependências de desconto ausentes';
  END IF;
END
$pre$;

CREATE OR REPLACE FUNCTION public.assert_quote_discount_integrity(_quote_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  _q public.quotes;
  _max_allowed numeric;
  _snapshot text;
BEGIN
  SELECT * INTO _q FROM public.quotes WHERE id = _quote_id;
  IF NOT FOUND OR _q.status IN ('expired', 'cancelled', 'rejected', 'converted') THEN
    RETURN;
  END IF;
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR current_setting('app.write_source', true) = 'cron_expire'
     OR auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT max_discount_percent INTO _max_allowed
  FROM public.seller_discount_limits
  WHERE user_id = COALESCE(_q.seller_id, _q.created_by);

  IF _max_allowed IS NULL THEN
    RAISE EXCEPTION 'Vendedor sem limite de desconto cadastrado.' USING ERRCODE = '23514';
  END IF;
  IF COALESCE(_q.real_discount_percent, 0) <= _max_allowed THEN
    RETURN;
  END IF;

  _snapshot := public.compute_quote_snapshot_hash(_quote_id);

  IF _q.status = 'pending_approval' THEN
    IF EXISTS (
      SELECT 1 FROM public.discount_approval_requests dar
      WHERE dar.quote_id = _quote_id AND dar.status = 'pending'
        AND dar.requested_discount_percent >= _q.real_discount_percent
        AND dar.quote_snapshot_hash = _snapshot
    ) THEN
      RETURN;
    END IF;
    -- Janela compatível com o fluxo legado: create/update salva o orçamento e
    -- a RPC de solicitação roda logo depois. Se já existe pending divergente,
    -- a mutação é bloqueada; sem pending, a RPC ainda pode criar a primeira.
    IF NOT EXISTS (
      SELECT 1 FROM public.discount_approval_requests dar
      WHERE dar.quote_id = _quote_id AND dar.status = 'pending'
    ) THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'Solicitação pendente não corresponde ao snapshot final do orçamento.'
      USING ERRCODE = '23514';
  END IF;

  IF _q.status = 'draft' AND EXISTS (
    SELECT 1 FROM public.discount_approval_requests dar
    WHERE dar.quote_id = _quote_id AND dar.status = 'rejected'
      AND dar.quote_snapshot_hash = _snapshot
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.discount_approval_requests dar
    WHERE dar.quote_id = _quote_id AND dar.status = 'approved'
      AND (dar.valid_until IS NULL OR dar.valid_until > now())
      AND dar.requested_discount_percent >= _q.real_discount_percent
      AND dar.quote_snapshot_hash = _snapshot
  ) THEN
    RETURN;
  END IF;

  RAISE EXCEPTION 'Snapshot final do orçamento não possui aprovação de desconto válida.'
    USING ERRCODE = '23514';
END;
$function$;

REVOKE ALL ON FUNCTION public.assert_quote_discount_integrity(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assert_quote_discount_integrity(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.fn_deferred_quote_discount_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  _quote_id uuid;
  _item_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'quotes' THEN
    _quote_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'quote_items' THEN
    _quote_id := COALESCE(NEW.quote_id, OLD.quote_id);
  ELSE
    _item_id := COALESCE(NEW.quote_item_id, OLD.quote_item_id);
    SELECT qi.quote_id INTO _quote_id
    FROM public.quote_items qi WHERE qi.id = _item_id;
    -- DELETE em cascata também é coberto pelo trigger de quote_items.
    IF _quote_id IS NULL THEN RETURN NULL; END IF;
  END IF;

  PERFORM public.assert_quote_discount_integrity(_quote_id);
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_deferred_quote_discount_integrity()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_quotes_discount_integrity_deferred ON public.quotes;
CREATE CONSTRAINT TRIGGER trg_quotes_discount_integrity_deferred
AFTER INSERT OR UPDATE ON public.quotes
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.fn_deferred_quote_discount_integrity();

DROP TRIGGER IF EXISTS trg_quote_items_discount_integrity_deferred ON public.quote_items;
CREATE CONSTRAINT TRIGGER trg_quote_items_discount_integrity_deferred
AFTER INSERT OR UPDATE OR DELETE ON public.quote_items
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.fn_deferred_quote_discount_integrity();

DROP TRIGGER IF EXISTS trg_quote_personalizations_discount_integrity_deferred
  ON public.quote_item_personalizations;
CREATE CONSTRAINT TRIGGER trg_quote_personalizations_discount_integrity_deferred
AFTER INSERT OR UPDATE OR DELETE ON public.quote_item_personalizations
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.fn_deferred_quote_discount_integrity();

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
  IF FOUND THEN RETURN _existing; END IF;

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

CREATE OR REPLACE FUNCTION public.respond_discount_approval_transactional(
  _request_id uuid,
  _approved boolean,
  _admin_notes text DEFAULT NULL
)
RETURNS public.discount_approval_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _quote_id uuid;
  _q public.quotes;
  _request public.discount_approval_requests;
  _decision text := CASE WHEN _approved THEN 'approved' ELSE 'rejected' END;
  _snapshot text;
BEGIN
  IF _uid IS NULL OR NOT public.is_supervisor_or_above(_uid) THEN
    RAISE EXCEPTION 'Apenas coordenador ou superior pode decidir aprovação.'
      USING ERRCODE = '42501';
  END IF;

  SELECT quote_id INTO _quote_id
  FROM public.discount_approval_requests WHERE id = _request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO _q FROM public.quotes WHERE id = _quote_id FOR UPDATE;
  SELECT * INTO _request
  FROM public.discount_approval_requests WHERE id = _request_id FOR UPDATE;

  IF _request.quote_id IS DISTINCT FROM _quote_id THEN
    RAISE EXCEPTION 'Solicitação mudou durante a decisão.' USING ERRCODE = '40001';
  END IF;
  IF _request.status = _decision THEN RETURN _request; END IF;
  IF _request.status <> 'pending' THEN
    RAISE EXCEPTION 'Decisão terminal conflitante: solicitação já está %.', _request.status
      USING ERRCODE = '23514';
  END IF;

  _snapshot := public.compute_quote_snapshot_hash(_quote_id);
  IF _request.quote_snapshot_hash IS DISTINCT FROM _snapshot
     OR _request.requested_discount_percent < COALESCE(_q.real_discount_percent, 0) THEN
    RAISE EXCEPTION 'Snapshot ou percentual mudou; solicite nova aprovação.'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.discount_approval_requests
  SET status = _decision,
      admin_id = _uid,
      admin_notes = NULLIF(btrim(_admin_notes), ''),
      responded_at = clock_timestamp(),
      valid_until = CASE WHEN _approved THEN clock_timestamp() + interval '30 days' ELSE NULL END
  WHERE id = _request_id
  RETURNING * INTO _request;

  IF NOT _approved THEN
    PERFORM set_config('app.discount_approval_request_id', _request_id::text, true);
  END IF;

  UPDATE public.quotes
  SET status = CASE WHEN _approved THEN 'pending' ELSE 'draft' END
  WHERE id = _quote_id;

  INSERT INTO public.quote_history (
    quote_id, user_id, action, description, field_changed,
    old_value, new_value, metadata
  ) VALUES (
    _quote_id, _uid,
    CASE WHEN _approved THEN 'discount_approved' ELSE 'discount_rejected' END,
    format('Desconto de %s%% %s pelo gestor',
      _request.requested_discount_percent,
      CASE WHEN _approved THEN 'aprovado' ELSE 'rejeitado' END),
    'discount', _request.max_allowed_percent::text || '%',
    _request.requested_discount_percent::text || '%',
    jsonb_build_object(
      'request_id', _request_id,
      'admin_notes', NULLIF(btrim(_admin_notes), ''),
      'status', _decision
    )
  );

  RETURN _request;
END;
$function$;

REVOKE ALL ON FUNCTION public.respond_discount_approval_transactional(uuid, boolean, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_discount_approval_transactional(uuid, boolean, text)
  TO authenticated, service_role;

-- Mantém toda a semântica live e acrescenta somente a transição estreita usada
-- pela RPC de rejeição. O assert diferido valida o snapshot final no COMMIT.
CREATE OR REPLACE FUNCTION public.fn_quotes_validate_discount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  _max_allowed numeric;
  _real_discount_pct numeric;
  _has_valid_approval boolean;
  _current_hash text;
  _seller_id uuid;
  _msg text;
  _decision_request_id uuid;
BEGIN
  IF NEW.status = 'expired' THEN RETURN NEW; END IF;
  IF current_setting('app.write_source', true) = 'cron_expire' THEN RETURN NEW; END IF;
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  BEGIN
    _decision_request_id := NULLIF(
      current_setting('app.discount_approval_request_id', true), ''
    )::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    _decision_request_id := NULL;
  END;

  IF TG_OP = 'UPDATE'
     AND OLD.status = 'pending_approval' AND NEW.status = 'draft'
     AND _decision_request_id IS NOT NULL
     AND NEW.client_id IS NOT DISTINCT FROM OLD.client_id
     AND NEW.client_name IS NOT DISTINCT FROM OLD.client_name
     AND NEW.subtotal IS NOT DISTINCT FROM OLD.subtotal
     AND NEW.discount_percent IS NOT DISTINCT FROM OLD.discount_percent
     AND NEW.discount_amount IS NOT DISTINCT FROM OLD.discount_amount
     AND NEW.negotiation_markup_percent IS NOT DISTINCT FROM OLD.negotiation_markup_percent
     AND NEW.total IS NOT DISTINCT FROM OLD.total
     AND NEW.real_discount_percent IS NOT DISTINCT FROM OLD.real_discount_percent
     AND NEW.seller_id IS NOT DISTINCT FROM OLD.seller_id
     AND NEW.created_by IS NOT DISTINCT FROM OLD.created_by
     AND EXISTS (
       SELECT 1 FROM public.discount_approval_requests dar
       WHERE dar.id = _decision_request_id AND dar.quote_id = NEW.id
         AND dar.status = 'rejected' AND dar.admin_id = auth.uid()
         AND dar.quote_snapshot_hash = public.compute_quote_snapshot_hash(NEW.id)
     ) THEN
    RETURN NEW;
  END IF;

  _seller_id := COALESCE(NEW.seller_id, NEW.created_by);
  IF _seller_id IS NULL THEN RETURN NEW; END IF;
  IF public.is_supervisor_or_above(_seller_id) THEN RETURN NEW; END IF;

  _real_discount_pct := COALESCE(NEW.real_discount_percent, 0);
  IF _real_discount_pct <= 0 THEN RETURN NEW; END IF;

  SELECT max_discount_percent INTO _max_allowed
  FROM public.seller_discount_limits WHERE user_id = _seller_id;
  IF _max_allowed IS NULL THEN
    RAISE EXCEPTION 'Vendedor sem limite de desconto cadastrado. Solicite ao admin que configure seu limite antes de salvar orcamentos.'
      USING ERRCODE = '23514';
  END IF;
  IF _real_discount_pct <= _max_allowed THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.status, 'draft') = 'pending_approval' THEN RETURN NEW; END IF;
    _msg := 'Desconto de ' || ROUND(_real_discount_pct, 2)::text ||
      ' por cento acima do seu limite de ' || ROUND(_max_allowed, 2)::text ||
      ' por cento. Para solicitar aprovacao, use o botao "Solicitar aprovacao ao coordenador" que cria o orcamento em status pendente.';
    RAISE EXCEPTION '%', _msg USING ERRCODE = '23514';
  END IF;

  _current_hash := public.compute_quote_snapshot_hash(NEW.id);
  SELECT EXISTS (
    SELECT 1 FROM public.discount_approval_requests
    WHERE quote_id = NEW.id AND status = 'approved'
      AND (valid_until IS NULL OR valid_until > now())
      AND requested_discount_percent >= _real_discount_pct
      AND quote_snapshot_hash = _current_hash
  ) INTO _has_valid_approval;
  IF _has_valid_approval THEN RETURN NEW; END IF;

  IF EXISTS (
    SELECT 1 FROM public.discount_approval_requests
    WHERE quote_id = NEW.id AND status = 'approved'
      AND ((valid_until IS NOT NULL AND valid_until <= now())
        OR quote_snapshot_hash <> _current_hash)
  ) THEN
    RAISE EXCEPTION 'Aprovacao anterior nao vale mais (orcamento foi alterado ou aprovacao expirou). Solicite nova aprovacao ao coordenador.'
      USING ERRCODE = '23514';
  END IF;

  IF COALESCE(NEW.status, 'draft') = 'pending_approval' THEN RETURN NEW; END IF;
  _msg := 'Desconto de ' || ROUND(_real_discount_pct, 2)::text ||
    ' por cento acima do seu limite de ' || ROUND(_max_allowed, 2)::text ||
    ' por cento. Solicite aprovacao ao coordenador antes de salvar.';
  RAISE EXCEPTION '%', _msg USING ERRCODE = '23514';
END;
$function$;

COMMENT ON FUNCTION public.fn_quotes_validate_discount() IS
  'Valida alçada e permite rejeição pending_approval→draft somente pela RPC transacional; assert diferido valida snapshot final.';

DO $post$
BEGIN
  IF to_regprocedure('public.request_discount_approval_transactional(uuid,text)') IS NULL
     OR to_regprocedure('public.respond_discount_approval_transactional(uuid,boolean,text)') IS NULL
     OR to_regprocedure('public.assert_quote_discount_integrity(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Postcondition failed: RPCs/assert ausentes';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.quotes'::regclass
      AND tgname = 'trg_quotes_discount_integrity_deferred'
      AND tgdeferrable AND tginitdeferred
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: trigger diferido de quotes ausente';
  END IF;
END
$post$;

COMMIT;
