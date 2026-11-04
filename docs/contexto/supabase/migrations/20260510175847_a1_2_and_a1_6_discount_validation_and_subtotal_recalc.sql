-- A1-2 + A1-6: Validação server-side de desconto + recálculo de subtotal
-- (Versão 3: digest() qualificado como extensions.digest)
-- Restore point: 2026-05-10 17:53:31 UTC, LSN D6/43000130

-- ===== BLOCO 1: Schema changes em discount_approval_requests =====

ALTER TABLE public.discount_approval_requests
  ADD COLUMN IF NOT EXISTS valid_until timestamptz;

ALTER TABLE public.discount_approval_requests
  DROP CONSTRAINT IF EXISTS dar_valid_until_required_when_approved;
ALTER TABLE public.discount_approval_requests
  ADD CONSTRAINT dar_valid_until_required_when_approved
  CHECK (status <> 'approved' OR valid_until IS NOT NULL);

ALTER TABLE public.discount_approval_requests
  ADD COLUMN IF NOT EXISTS quote_snapshot_hash text;

ALTER TABLE public.discount_approval_requests
  DROP CONSTRAINT IF EXISTS discount_approval_requests_status_check;
ALTER TABLE public.discount_approval_requests
  ADD CONSTRAINT discount_approval_requests_status_check
  CHECK (status = ANY (ARRAY['pending', 'approved', 'rejected', 'expired']));

CREATE INDEX IF NOT EXISTS idx_dar_quote_active_approval
  ON public.discount_approval_requests (quote_id, valid_until)
  WHERE status = 'approved';

-- ===== BLOCO 2: compute_quote_snapshot_hash (extensions.digest qualificado) =====

CREATE OR REPLACE FUNCTION public.compute_quote_snapshot_hash(_quote_id uuid)
  RETURNS text
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _hash_input text;
  _quote_data text;
  _items_data text;
  _personalizations_data text;
BEGIN
  SELECT 
    COALESCE(client_id::text, '') || '|' ||
    COALESCE(client_name, '') || '|' ||
    COALESCE(subtotal::text, '0') || '|' ||
    COALESCE(discount_percent::text, '0') || '|' ||
    COALESCE(discount_amount::text, '0') || '|' ||
    COALESCE(negotiation_markup_percent::text, '0') || '|' ||
    COALESCE(total::text, '0')
  INTO _quote_data
  FROM public.quotes
  WHERE id = _quote_id;
  
  SELECT COALESCE(string_agg(
    COALESCE(qi.id::text, '') || ':' ||
    COALESCE(qi.product_id::text, '') || ':' ||
    COALESCE(qi.quantity::text, '0') || ':' ||
    COALESCE(qi.unit_price::text, '0') || ':' ||
    COALESCE(qi.subtotal::text, '0'),
    '|' ORDER BY qi.id
  ), '') INTO _items_data
  FROM public.quote_items qi
  WHERE qi.quote_id = _quote_id;
  
  SELECT COALESCE(string_agg(
    COALESCE(qip.id::text, '') || ':' ||
    COALESCE(qip.technique_id::text, '') || ':' ||
    COALESCE(qip.colors_count::text, '0') || ':' ||
    COALESCE(qip.positions_count::text, '0') || ':' ||
    COALESCE(qip.total_cost::text, '0'),
    '|' ORDER BY qip.id
  ), '') INTO _personalizations_data
  FROM public.quote_item_personalizations qip
  JOIN public.quote_items qi ON qi.id = qip.quote_item_id
  WHERE qi.quote_id = _quote_id;
  
  _hash_input := COALESCE(_quote_data, '') || '||' || 
                 COALESCE(_items_data, '') || '||' || 
                 COALESCE(_personalizations_data, '');
  
  RETURN encode(extensions.digest(_hash_input, 'sha1'), 'hex');
END;
$$;

COMMENT ON FUNCTION public.compute_quote_snapshot_hash(uuid) IS
  'A1-2: Calcula hash SHA1 do estado de uma quote (Estrita: discount, subtotal, total, markup, cliente, items, personalizations). Usa extensions.digest qualificado.';

-- ===== BLOCO 3: Trigger snapshot hash em discount_approval_requests =====

CREATE OR REPLACE FUNCTION public.fn_dar_set_snapshot_hash()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.quote_snapshot_hash := public.compute_quote_snapshot_hash(NEW.quote_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dar_set_snapshot_hash ON public.discount_approval_requests;
CREATE TRIGGER trg_dar_set_snapshot_hash
  BEFORE INSERT ON public.discount_approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.fn_dar_set_snapshot_hash();

-- ===== BLOCO 4: Trigger guarda do desconto =====

CREATE OR REPLACE FUNCTION public.fn_quotes_validate_discount()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _max_allowed numeric;
  _real_discount_pct numeric;
  _has_valid_approval boolean;
  _current_hash text;
  _seller_id uuid;
  _msg text;
BEGIN
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
    _msg := 'Desconto de ' || ROUND(_real_discount_pct, 2)::text || 
            ' por cento acima do seu limite de ' || ROUND(_max_allowed, 2)::text || 
            ' por cento. Salve o orcamento com desconto dentro do limite primeiro, depois solicite aprovacao ao coordenador.';
    RAISE EXCEPTION '%', _msg USING ERRCODE = '23514';
  END IF;
  
  _current_hash := public.compute_quote_snapshot_hash(NEW.id);
  
  SELECT EXISTS (
    SELECT 1 FROM public.discount_approval_requests
    WHERE quote_id = NEW.id
      AND status = 'approved'
      AND valid_until > now()
      AND requested_discount_percent >= _real_discount_pct
      AND quote_snapshot_hash = _current_hash
  ) INTO _has_valid_approval;
  
  IF _has_valid_approval THEN
    RETURN NEW;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM public.discount_approval_requests
    WHERE quote_id = NEW.id AND status = 'approved'
      AND (valid_until <= now() OR quote_snapshot_hash <> _current_hash)
  ) THEN
    RAISE EXCEPTION 'Aprovacao anterior nao vale mais (orcamento foi alterado ou aprovacao expirou). Solicite nova aprovacao ao coordenador.'
      USING ERRCODE = '23514';
  END IF;
  
  _msg := 'Desconto de ' || ROUND(_real_discount_pct, 2)::text || 
          ' por cento acima do seu limite de ' || ROUND(_max_allowed, 2)::text || 
          ' por cento. Solicite aprovacao ao coordenador antes de salvar.';
  RAISE EXCEPTION '%', _msg USING ERRCODE = '23514';
END;
$$;

COMMENT ON FUNCTION public.fn_quotes_validate_discount() IS
  'A1-2: Guarda do desconto. Vendedores tem teto em seller_discount_limits; acima do teto requer aprovacao em discount_approval_requests com snapshot hash valido. Coordenador+ passa direto. service_role bypassa.';

DROP TRIGGER IF EXISTS trg_quotes_validate_discount ON public.quotes;
CREATE TRIGGER trg_quotes_validate_discount
  BEFORE INSERT OR UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.fn_quotes_validate_discount();

-- ===== BLOCO 5: Trigger imutabilidade approved/converted =====

CREATE OR REPLACE FUNCTION public.fn_quotes_enforce_immutability()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _msg text;
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  
  IF OLD.status NOT IN ('approved', 'converted') THEN
    RETURN NEW;
  END IF;
  
  IF OLD.* IS NOT DISTINCT FROM NEW.* THEN
    RETURN NEW;
  END IF;
  
  IF OLD.status <> NEW.status THEN
    IF (OLD.status = 'approved' AND NEW.status IN ('converted', 'expired'))
       OR (OLD.status = 'converted' AND NEW.status = 'expired') THEN
      IF (
        OLD.client_id IS DISTINCT FROM NEW.client_id OR
        OLD.client_name IS DISTINCT FROM NEW.client_name OR
        OLD.subtotal IS DISTINCT FROM NEW.subtotal OR
        OLD.discount_percent IS DISTINCT FROM NEW.discount_percent OR
        OLD.discount_amount IS DISTINCT FROM NEW.discount_amount OR
        OLD.total IS DISTINCT FROM NEW.total OR
        OLD.negotiation_markup_percent IS DISTINCT FROM NEW.negotiation_markup_percent OR
        OLD.real_subtotal IS DISTINCT FROM NEW.real_subtotal OR
        OLD.real_discount_percent IS DISTINCT FROM NEW.real_discount_percent OR
        OLD.shipping_cost IS DISTINCT FROM NEW.shipping_cost OR
        OLD.tax_amount IS DISTINCT FROM NEW.tax_amount OR
        OLD.seller_id IS DISTINCT FROM NEW.seller_id OR
        OLD.created_by IS DISTINCT FROM NEW.created_by OR
        OLD.assigned_to IS DISTINCT FROM NEW.assigned_to
      ) THEN
        _msg := 'Orcamento em status ' || OLD.status || 
                ' e imutavel. So a transicao de status e permitida; valores e atribuicoes nao podem mudar. Crie um novo orcamento.';
        RAISE EXCEPTION '%', _msg USING ERRCODE = '23514';
      END IF;
      RETURN NEW;
    ELSE
      _msg := 'Transicao de status nao permitida: ' || OLD.status || ' para ' || NEW.status || 
              '. Orcamento em status ' || OLD.status || ' so pode ir para converted ou expired.';
      RAISE EXCEPTION '%', _msg USING ERRCODE = '23514';
    END IF;
  END IF;
  
  _msg := 'Orcamento em status ' || OLD.status || 
          ' e imutavel. Crie um novo orcamento para alterar valores.';
  RAISE EXCEPTION '%', _msg USING ERRCODE = '23514';
END;
$$;

COMMENT ON FUNCTION public.fn_quotes_enforce_immutability() IS
  'A1-2: Bloqueia mudancas em quotes com status approved/converted. Permite apenas: approved->converted, approved->expired, converted->expired. service_role bypassa.';

DROP TRIGGER IF EXISTS trg_quotes_immutability ON public.quotes;
CREATE TRIGGER trg_quotes_immutability
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.fn_quotes_enforce_immutability();

-- ===== BLOCO 6: Imutabilidade de items =====

CREATE OR REPLACE FUNCTION public.fn_quote_children_enforce_parent_immutability()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _parent_quote_id uuid;
  _parent_status text;
  _msg text;
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  IF TG_TABLE_NAME = 'quote_items' THEN
    _parent_quote_id := COALESCE(NEW.quote_id, OLD.quote_id);
  ELSIF TG_TABLE_NAME = 'quote_item_personalizations' THEN
    SELECT qi.quote_id INTO _parent_quote_id
    FROM public.quote_items qi
    WHERE qi.id = COALESCE(NEW.quote_item_id, OLD.quote_item_id);
  END IF;
  
  IF _parent_quote_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  SELECT status INTO _parent_status
  FROM public.quotes WHERE id = _parent_quote_id;
  
  IF _parent_status IN ('approved', 'converted') THEN
    _msg := 'Nao e possivel alterar itens de orcamento ja aprovado/convertido (status ' || 
            _parent_status || '). Crie um novo orcamento.';
    RAISE EXCEPTION '%', _msg USING ERRCODE = '23514';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.fn_quote_children_enforce_parent_immutability() IS
  'A1-2: Bloqueia INSERT/UPDATE/DELETE em quote_items e quote_item_personalizations quando quote pai esta em status approved ou converted.';

DROP TRIGGER IF EXISTS trg_quote_items_parent_immutable ON public.quote_items;
CREATE TRIGGER trg_quote_items_parent_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON public.quote_items
  FOR EACH ROW EXECUTE FUNCTION public.fn_quote_children_enforce_parent_immutability();

DROP TRIGGER IF EXISTS trg_qip_parent_immutable ON public.quote_item_personalizations;
CREATE TRIGGER trg_qip_parent_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON public.quote_item_personalizations
  FOR EACH ROW EXECUTE FUNCTION public.fn_quote_children_enforce_parent_immutability();

-- ===== BLOCO 7: A1-6 Recalc subtotal =====

CREATE OR REPLACE FUNCTION public.fn_quotes_recalc_subtotal_from_items()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _quote_id uuid;
  _new_subtotal numeric(12,2);
  _quote_status text;
  _markup numeric;
  _new_total numeric(12,2);
  _discount_amt numeric;
BEGIN
  _quote_id := COALESCE(NEW.quote_id, OLD.quote_id);
  
  IF _quote_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  SELECT status, COALESCE(negotiation_markup_percent, 0), COALESCE(discount_amount, 0)
  INTO _quote_status, _markup, _discount_amt
  FROM public.quotes WHERE id = _quote_id;
  
  IF _quote_status IN ('approved', 'converted') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  SELECT COALESCE(SUM(quantity * unit_price + COALESCE(personalization_cost, 0)), 0)
  INTO _new_subtotal
  FROM public.quote_items
  WHERE quote_id = _quote_id;
  
  _new_total := _new_subtotal - _discount_amt;
  
  UPDATE public.quotes 
  SET subtotal = _new_subtotal,
      total = _new_total,
      updated_at = now()
  WHERE id = _quote_id
    AND (subtotal IS DISTINCT FROM _new_subtotal OR total IS DISTINCT FROM _new_total);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.fn_quotes_recalc_subtotal_from_items() IS
  'A1-6: Recalcula quotes.subtotal e quotes.total quando quote_items muda. Resultado: vendedor adicionar produto invalida aprovacao via mudanca de hash.';

DROP TRIGGER IF EXISTS trg_quotes_recalc_from_items ON public.quote_items;
CREATE TRIGGER trg_quotes_recalc_from_items
  AFTER INSERT OR UPDATE OR DELETE ON public.quote_items
  FOR EACH ROW EXECUTE FUNCTION public.fn_quotes_recalc_subtotal_from_items();

CREATE OR REPLACE FUNCTION public.fn_qip_propagate_to_quote_items()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _quote_item_id uuid;
  _new_personalization_cost numeric(12,2);
BEGIN
  _quote_item_id := COALESCE(NEW.quote_item_id, OLD.quote_item_id);
  
  SELECT COALESCE(SUM(total_cost), 0) INTO _new_personalization_cost
  FROM public.quote_item_personalizations
  WHERE quote_item_id = _quote_item_id;
  
  UPDATE public.quote_items 
  SET personalization_cost = _new_personalization_cost,
      has_personalization = (_new_personalization_cost > 0),
      updated_at = now()
  WHERE id = _quote_item_id
    AND personalization_cost IS DISTINCT FROM _new_personalization_cost;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.fn_qip_propagate_to_quote_items() IS
  'A1-6: Propaga mudancas em personalizations para quote_items.personalization_cost.';

DROP TRIGGER IF EXISTS trg_qip_propagate ON public.quote_item_personalizations;
CREATE TRIGGER trg_qip_propagate
  AFTER INSERT OR UPDATE OR DELETE ON public.quote_item_personalizations
  FOR EACH ROW EXECUTE FUNCTION public.fn_qip_propagate_to_quote_items();

-- ===== BLOCO 8: Auto-criar seller_discount_limits =====

CREATE OR REPLACE FUNCTION public.fn_ensure_seller_discount_limit()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.role = 'vendedor'::public.app_role THEN
    INSERT INTO public.seller_discount_limits (user_id, max_discount_percent, set_by, notes)
    VALUES (
      NEW.user_id, 
      0,
      COALESCE(NEW.granted_by, NEW.user_id),
      'Limite criado automaticamente quando user virou vendedor (A1-2). Admin deve configurar valor real.'
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_ensure_seller_discount_limit() IS
  'A1-2: Auto-cria seller_discount_limits com max=0 quando user vira vendedor.';

DROP TRIGGER IF EXISTS trg_ensure_seller_discount_limit ON public.user_roles;
CREATE TRIGGER trg_ensure_seller_discount_limit
  AFTER INSERT OR UPDATE OF role ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.fn_ensure_seller_discount_limit();

-- ===== BLOCO 9: Backfill =====
INSERT INTO public.seller_discount_limits (user_id, max_discount_percent, notes)
SELECT 
  ur.user_id,
  0,
  'Backfill A1-2: linha criada para garantir que vendedor tem limite definido'
FROM public.user_roles ur
WHERE ur.role = 'vendedor'::public.app_role
  AND NOT EXISTS (SELECT 1 FROM public.seller_discount_limits sdl WHERE sdl.user_id = ur.user_id)
ON CONFLICT (user_id) DO NOTHING;

-- ===== BLOCO 10: Validação =====

DO $$
DECLARE
  _vendedores_sem_limite int;
BEGIN
  SELECT COUNT(*) INTO _vendedores_sem_limite
  FROM public.user_roles ur
  WHERE ur.role = 'vendedor'::public.app_role
    AND NOT EXISTS (SELECT 1 FROM public.seller_discount_limits sdl WHERE sdl.user_id = ur.user_id);
  IF _vendedores_sem_limite > 0 THEN
    RAISE EXCEPTION 'A1-2: % vendedor(es) sem limite cadastrado.', _vendedores_sem_limite;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_quotes_validate_discount' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'A1-2: trg_quotes_validate_discount nao foi criado.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_quotes_immutability' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'A1-2: trg_quotes_immutability nao foi criado.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_quotes_recalc_from_items' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'A1-6: trg_quotes_recalc_from_items nao foi criado.';
  END IF;
  
  PERFORM public.compute_quote_snapshot_hash(id) FROM public.quotes LIMIT 1;
  
  RAISE NOTICE 'A1-2 + A1-6 OK.';
END $$;
