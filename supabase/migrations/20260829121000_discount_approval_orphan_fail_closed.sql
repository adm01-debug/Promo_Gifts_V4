-- Forward-only: depois dos wrappers atômicos, pending_approval sem solicitação
-- correspondente deixa de ser um estado intermediário aceito. Mudanças no DAR
-- também revalidam o orçamento ao fim da transação.

BEGIN;

CREATE OR REPLACE FUNCTION public.assert_quote_discount_integrity(_quote_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  _q public.quotes;
  _owner_id uuid;
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

  _owner_id := COALESCE(_q.seller_id, _q.created_by);
  IF COALESCE(_q.real_discount_percent, 0) <= 0
     OR _owner_id IS NULL
     OR public.is_supervisor_or_above(_owner_id) THEN
    RETURN;
  END IF;

  SELECT max_discount_percent INTO _max_allowed
  FROM public.seller_discount_limits
  WHERE user_id = _owner_id;

  IF _max_allowed IS NULL THEN
    RAISE EXCEPTION 'Vendedor sem limite de desconto cadastrado.' USING ERRCODE = '23514';
  END IF;
  IF _q.real_discount_percent <= _max_allowed THEN
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
    RAISE EXCEPTION 'Orçamento pending_approval não possui solicitação pendente para o snapshot final.'
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

CREATE OR REPLACE FUNCTION public.fn_deferred_dar_quote_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  _old_quote_id uuid;
  _new_quote_id uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN _old_quote_id := OLD.quote_id; END IF;
  IF TG_OP <> 'DELETE' THEN _new_quote_id := NEW.quote_id; END IF;

  IF _old_quote_id IS NOT NULL THEN
    PERFORM public.assert_quote_discount_integrity(_old_quote_id);
  END IF;
  IF _new_quote_id IS NOT NULL AND _new_quote_id IS DISTINCT FROM _old_quote_id THEN
    PERFORM public.assert_quote_discount_integrity(_new_quote_id);
  END IF;
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_deferred_dar_quote_integrity()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_deferred_dar_quote_integrity() TO service_role;

DROP TRIGGER IF EXISTS trg_dar_quote_integrity_deferred
  ON public.discount_approval_requests;
CREATE CONSTRAINT TRIGGER trg_dar_quote_integrity_deferred
AFTER INSERT OR UPDATE OR DELETE ON public.discount_approval_requests
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.fn_deferred_dar_quote_integrity();

DO $post$
DECLARE
  _def text := pg_get_functiondef('public.assert_quote_discount_integrity(uuid)'::regprocedure);
BEGIN
  IF position('não possui solicitação pendente' IN _def) = 0
     OR NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conrelid = 'public.discount_approval_requests'::regclass
         AND conname = 'trg_dar_quote_integrity_deferred'
         AND contype = 't' AND condeferrable AND condeferred
     ) THEN
    RAISE EXCEPTION 'Postcondition failed: proteção fail-closed de órfãos ausente';
  END IF;
END
$post$;

COMMIT;
