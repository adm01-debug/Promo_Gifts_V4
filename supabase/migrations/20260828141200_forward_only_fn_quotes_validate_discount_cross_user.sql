-- Forward-only: corrige o único uso cross-user de is_coord_or_above, sem
-- perder os bypasses legítimos de expiração/cron/service-role existentes live.
-- PREPARADA, NÃO APLICADA ao projeto canônico em 2026-08-28.

DO $precondition$
DECLARE
  _definition text;
  _security_definer boolean;
BEGIN
  IF to_regprocedure('public.fn_quotes_validate_discount()') IS NULL THEN
    RAISE EXCEPTION 'Precondition failed: fn_quotes_validate_discount() does not exist';
  END IF;
  IF to_regprocedure('public.is_supervisor_or_above(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Precondition failed: is_supervisor_or_above(uuid) does not exist';
  END IF;
  IF to_regprocedure('public.compute_quote_snapshot_hash(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Precondition failed: compute_quote_snapshot_hash(uuid) does not exist';
  END IF;

  SELECT pg_get_functiondef(p.oid), p.prosecdef
  INTO _definition, _security_definer
  FROM pg_catalog.pg_proc p
  WHERE p.oid = 'public.fn_quotes_validate_discount()'::regprocedure;

  -- Drift guard: preserva os bypasses e a semântica da versão live auditada.
  -- Se qualquer agente já tiver reconciliado ou evoluído a função, reauditar.
  IF NOT _security_definer
     OR strpos(_definition, 'is_coord_or_above(_seller_id)') = 0
     OR strpos(_definition, 'auth.uid() IS NULL') = 0
     OR strpos(_definition, 'cron_expire') = 0
     OR strpos(_definition, 'pending_approval') = 0
     OR strpos(_definition, 'valid_until IS NULL OR valid_until > now()') = 0 THEN
    RAISE EXCEPTION 'Precondition failed: fn_quotes_validate_discount drifted from the audited 2026-08-28 live definition';
  END IF;
END
$precondition$;

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
BEGIN
  -- Expiração automática só muda status e não pode ser bloqueada por alçada.
  IF NEW.status = 'expired' THEN
    RETURN NEW;
  END IF;

  IF current_setting('app.write_source', true) = 'cron_expire' THEN
    RETURN NEW;
  END IF;

  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Contextos internos sem usuário continuam protegidos pela RLS/role externa.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  _seller_id := COALESCE(NEW.seller_id, NEW.created_by);
  IF _seller_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Cross-user intencional: valida o papel do dono do orçamento. O helper
  -- is_coord_or_above protege leituras self-scoped e lançava 42501 neste caso.
  IF public.is_supervisor_or_above(_seller_id) THEN
    RETURN NEW;
  END IF;

  _real_discount_pct := COALESCE(NEW.real_discount_percent, 0);
  IF _real_discount_pct <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT max_discount_percent
  INTO _max_allowed
  FROM public.seller_discount_limits
  WHERE user_id = _seller_id;

  IF _max_allowed IS NULL THEN
    RAISE EXCEPTION 'Vendedor sem limite de desconto cadastrado. Solicite ao admin que configure seu limite antes de salvar orcamentos.'
      USING ERRCODE = '23514';
  END IF;

  IF _real_discount_pct <= _max_allowed THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.status, 'draft') = 'pending_approval' THEN
      RETURN NEW;
    END IF;
    _msg := 'Desconto de ' || ROUND(_real_discount_pct, 2)::text ||
            ' por cento acima do seu limite de ' || ROUND(_max_allowed, 2)::text ||
            ' por cento. Para solicitar aprovacao, use o botao "Solicitar aprovacao ao coordenador"' ||
            ' que cria o orcamento em status pendente.';
    RAISE EXCEPTION '%', _msg USING ERRCODE = '23514';
  END IF;

  _current_hash := public.compute_quote_snapshot_hash(NEW.id);

  SELECT EXISTS (
    SELECT 1
    FROM public.discount_approval_requests
    WHERE quote_id = NEW.id
      AND status = 'approved'
      AND (valid_until IS NULL OR valid_until > now())
      AND requested_discount_percent >= _real_discount_pct
      AND quote_snapshot_hash = _current_hash
  ) INTO _has_valid_approval;

  IF _has_valid_approval THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.discount_approval_requests
    WHERE quote_id = NEW.id
      AND status = 'approved'
      AND (
        (valid_until IS NOT NULL AND valid_until <= now())
        OR quote_snapshot_hash <> _current_hash
      )
  ) THEN
    RAISE EXCEPTION 'Aprovacao anterior nao vale mais (orcamento foi alterado ou aprovacao expirou). Solicite nova aprovacao ao coordenador.'
      USING ERRCODE = '23514';
  END IF;

  IF COALESCE(NEW.status, 'draft') = 'pending_approval' THEN
    RETURN NEW;
  END IF;

  _msg := 'Desconto de ' || ROUND(_real_discount_pct, 2)::text ||
          ' por cento acima do seu limite de ' || ROUND(_max_allowed, 2)::text ||
          ' por cento. Solicite aprovacao ao coordenador antes de salvar.';
  RAISE EXCEPTION '%', _msg USING ERRCODE = '23514';
END;
$function$;

COMMENT ON FUNCTION public.fn_quotes_validate_discount() IS
  'Valida alçada real; cross-user usa is_supervisor_or_above e preserva bypasses internos/expiração.';

DO $postcondition$
DECLARE
  _definition text;
BEGIN
  SELECT pg_get_functiondef('public.fn_quotes_validate_discount()'::regprocedure)
  INTO _definition;

  IF strpos(_definition, 'is_supervisor_or_above(_seller_id)') = 0
     OR strpos(_definition, 'auth.uid() IS NULL') = 0
     OR strpos(_definition, 'cron_expire') = 0
     OR strpos(_definition, 'pending_approval') = 0
     OR strpos(_definition, 'valid_until IS NULL OR valid_until > now()') = 0 THEN
    RAISE EXCEPTION 'Postcondition failed: reconciled fn_quotes_validate_discount body is incomplete';
  END IF;
  IF strpos(_definition, 'is_coord_or_above(_seller_id)') > 0 THEN
    RAISE EXCEPTION 'Postcondition failed: unsafe cross-user helper remains';
  END IF;
END
$postcondition$;
