CREATE OR REPLACE FUNCTION public.fn_quotes_validate_discount()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
