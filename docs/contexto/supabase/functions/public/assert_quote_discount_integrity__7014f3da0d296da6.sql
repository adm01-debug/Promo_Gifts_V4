CREATE OR REPLACE FUNCTION public.assert_quote_discount_integrity(_quote_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
