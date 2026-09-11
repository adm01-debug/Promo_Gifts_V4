-- BUG P2 (split-brain de frete): o recálculo no banco somava shipping_cost ao total
-- para shipping_type IN ('fob','fob_pre'), mas o frontend (calculateQuoteTotals) e a
-- semântica de negócio somam apenas 'fob_pre' (cif = cortesia; fob = cliente paga direto
-- à transportadora; fob_pre = pré-negociado, com custo embutido). Hoje converge porque
-- 'fob' sempre chega com custo 0, mas é um bug latente: bastaria um 'fob' com custo > 0
-- para o total do banco divergir do total exibido. Alinhamos o gatilho ao SSOT do frontend.
CREATE OR REPLACE FUNCTION public.fn_quotes_recalc_subtotal_from_items()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _quote_id uuid;
  _quote_status text;
  _markup numeric;
  _disc_amount_db numeric;
  _disc_pct numeric;
  _ship_type text;
  _ship_cost numeric;
  _real_subtotal numeric(12,2);
  _new_subtotal numeric(12,2);
  _ship_value numeric(12,2);
  _disc_value numeric(12,2);
  _new_total numeric(12,2);
BEGIN
  _quote_id := COALESCE(NEW.quote_id, OLD.quote_id);
  IF _quote_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT
    status,
    LEAST(50, GREATEST(0, COALESCE(negotiation_markup_percent, 0))),
    COALESCE(discount_amount, 0),
    COALESCE(discount_percent, 0),
    shipping_type,
    COALESCE(shipping_cost, 0)
  INTO _quote_status, _markup, _disc_amount_db, _disc_pct, _ship_type, _ship_cost
  FROM public.quotes WHERE id = _quote_id;

  -- Nao mexer em quotes aprovados/convertidos (imutaveis)
  IF _quote_status IN ('approved', 'converted') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- REAL: soma pura dos itens (sem markup)
  SELECT COALESCE(SUM(quantity * unit_price + COALESCE(personalization_cost, 0)), 0)
  INTO _real_subtotal
  FROM public.quote_items
  WHERE quote_id = _quote_id;

  -- APRESENTADO ao cliente: aplica markup
  _new_subtotal := ROUND(_real_subtotal * (1 + _markup / 100.0), 2);

  -- DESCONTO: discount_percent tem prioridade (espelha logica do frontend)
  IF _disc_pct > 0 THEN
    _disc_value := ROUND(_new_subtotal * (_disc_pct / 100.0), 2);
  ELSE
    _disc_value := _disc_amount_db;
  END IF;

  -- FRETE: somente 'fob_pre' (pré-negociado com custo) entra no total.
  -- Alinhado ao frontend (calculateQuoteTotals): cif/fob/null não somam.
  _ship_value := CASE WHEN _ship_type = 'fob_pre' THEN _ship_cost ELSE 0 END;

  -- TOTAL final
  _new_total := _new_subtotal - _disc_value + _ship_value;

  -- UPDATE apenas se mudou (evita loop com trigger BEFORE em quotes)
  UPDATE public.quotes
  SET subtotal = _new_subtotal,
      total = _new_total,
      discount_amount = _disc_value,
      updated_at = now()
  WHERE id = _quote_id
    AND (subtotal IS DISTINCT FROM _new_subtotal
      OR total IS DISTINCT FROM _new_total
      OR discount_amount IS DISTINCT FROM _disc_value);

  RETURN COALESCE(NEW, OLD);
END;
$function$;;
