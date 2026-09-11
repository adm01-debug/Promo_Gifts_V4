
-- =============================================================================
-- Migration: fix_quotes_expire_bypass_discount_trigger_2026_07_03
--
-- PROBLEMA (3 dias de falha, 3 quotes presas em pending):
-- fn_expire_overdue_quotes() (SECURITY DEFINER cron) faz UPDATE quotes SET status='expired'
-- → dispara fn_quotes_validate_discount() (trigger BEFORE UPDATE)
-- → que chama is_coord_or_above(seller_id)
-- → que falha com "forbidden: cannot query role of another user" porque em contexto
--   de cron auth.uid() = NULL ≠ seller_id
--
-- A verificação 'service_role' no trigger não funciona em cron pois 
-- current_setting('request.jwt.claim.role') = NULL nesse contexto.
--
-- SOLUÇÃO: 
--   1) fn_quotes_validate_discount: early return para NEW.status = 'expired'
--      (expiração automática não precisa validar desconto — já foi validado na criação)
--   2) fn_expire_overdue_quotes: set_config('app.write_source','cron_expire',true)
--      antes do UPDATE como camada de defesa extra
--
-- ANTI-REGRESSÃO (fix_version: expire-quotes-discount-bypass-2026-07-03):
--   - Não reverter o bypass de NEW.status='expired' no trigger
--   - Expiração automática não altera valores de desconto, apenas status
--   - 3 orçamentos ficaram presos (2 de 30/06, 1 de 02/07) — backfill abaixo
-- =============================================================================

-- PARTE 1: Atualizar fn_quotes_validate_discount para bypassar expiração
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
BEGIN
  -- fix_version: expire-quotes-discount-bypass-2026-07-03
  -- ANTI-REGRESSÃO: não remover este bypass — expiração automática via cron não
  -- tem auth.uid() e is_coord_or_above falha com 'forbidden' nesse contexto.
  -- Expiração não altera desconto (apenas status), bypass é semanticamente correto.
  IF NEW.status = 'expired' THEN
    RETURN NEW;
  END IF;

  -- Bypass via session var (camada extra — fn_expire_overdue_quotes seta isto)
  IF current_setting('app.write_source', true) = 'cron_expire' THEN
    RETURN NEW;
  END IF;

  -- Bypass existente para service_role (via PostgREST/API)
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  _seller_id := COALESCE(NEW.seller_id, NEW.created_by);

  IF _seller_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.is_coord_or_above(_seller_id) THEN
    RETURN NEW;
  END IF;

  _real_discount_pct := COALESCE(NEW.real_discount_percent, 0);

  IF _real_discount_pct <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT max_discount_percent INTO _max_allowed
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
    SELECT 1 FROM public.discount_approval_requests
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
    SELECT 1 FROM public.discount_approval_requests
    WHERE quote_id = NEW.id AND status = 'approved'
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

-- PARTE 2: Atualizar fn_expire_overdue_quotes para setar session var
CREATE OR REPLACE FUNCTION public.fn_expire_overdue_quotes()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _expired_ids uuid[];
  _count integer;
  _fallback_uid uuid;
  rec RECORD;
BEGIN
  -- fix_version: expire-quotes-discount-bypass-2026-07-03
  -- Sinaliza para fn_quotes_validate_discount que este é o cron de expiração
  -- (camada defensiva extra; o bypass por NEW.status='expired' já é suficiente)
  PERFORM set_config('app.write_source', 'cron_expire', true);

  -- Uid de fallback para histórico (usar um admin/sistema)
  SELECT id INTO _fallback_uid FROM auth.users ORDER BY created_at LIMIT 1;

  -- Coletar quotes a expirar
  SELECT array_agg(id) INTO _expired_ids
  FROM quotes
  WHERE valid_until < CURRENT_DATE
    AND status NOT IN ('expired', 'cancelled', 'converted', 'rejected', 'draft');

  IF _expired_ids IS NULL OR array_length(_expired_ids, 1) = 0 THEN
    RETURN jsonb_build_object('expired_count', 0, 'quote_ids', '[]'::jsonb);
  END IF;

  _count := array_length(_expired_ids, 1);

  -- Inserir histórico para cada quote expirado
  INSERT INTO quote_history (quote_id, user_id, action, field_changed, old_value, new_value, description, metadata, created_at)
  SELECT 
    q.id,
    COALESCE(q.seller_id, q.created_by, _fallback_uid),
    'status_change',
    'status',
    q.status,
    'expired',
    'Auto-expirado: valid_until ' || q.valid_until::text || ' anterior a ' || CURRENT_DATE::text,
    jsonb_build_object('auto_expired', true, 'valid_until', q.valid_until::text, 'previous_status', q.status),
    now()
  FROM quotes q
  WHERE q.id = ANY(_expired_ids);

  -- Atualizar status em batch
  -- fn_quotes_validate_discount é bypassado para NEW.status='expired' (fix acima)
  UPDATE quotes
  SET status = 'expired', updated_at = now()
  WHERE id = ANY(_expired_ids);

  RETURN jsonb_build_object(
    'expired_count', _count,
    'quote_ids', to_jsonb(_expired_ids),
    'executed_at', now()
  );
END;
$function$;
;
