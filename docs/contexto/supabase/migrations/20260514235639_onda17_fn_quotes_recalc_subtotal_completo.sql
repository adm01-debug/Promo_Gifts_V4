-- Onda 17 / item 5.1: corrige fn_quotes_recalc_subtotal_from_items para aplicar
-- a formula completa (markup + discount_percent + shipping) alinhada com o frontend.
--
-- BUG ANTERIOR: trigger recalculava quotes.subtotal = SUM(qty*price+perso) SEM
-- aplicar negotiation_markup_percent. Como trg_quotes_calc_real_values (BEFORE)
-- assume que NEW.subtotal vem COM markup e calcula real_subtotal = subtotal/(1+markup),
-- inserir/atualizar items corrompia o real_subtotal (usado em validacao de alcada).
--
-- Cenario do bug:
--   1. Cliente edita quote via wizard: realSubtotal=1000, markup=10, envia subtotal=1100
--   2. Trigger BEFORE: real_subtotal = 1100/1.10 = 1000 ✓
--   3. Cliente adiciona 1 item ao quote: INSERT quote_items (qty=10, price=100)
--   4. Trigger AFTER items recalcula: UPDATE quotes SET subtotal=1000 (sem markup!)
--   5. Trigger BEFORE roda: real_subtotal = 1000/1.10 = 909.09 ✗ CORROMPIDO
--
-- FIX: aplica a mesma formula do frontend (calculateQuoteTotals):
--   real_subtotal := SUM(qty * unit_price + personalization_cost)
--   subtotal := real_subtotal * (1 + markup/100)
--   discount := if discount_percent > 0 then subtotal*(discount_percent/100) else discount_amount
--   shipping := if shipping_type in ('fob','fob_pre') then shipping_cost else 0
--   total := subtotal - discount + shipping
--
-- Tambem grava discount_amount derivado de discount_percent (reconciliacao automatica
-- resolve o item 2 da auditoria 5.1: "discount_amount inconsistente com discount_percent").
--
-- Ref: docs/AUDITORIA-PROFUNDA-PROMOGIFTS-PRE-PROD.md (item 5.1)

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

  -- FRETE FOB (somente FOB entra no total)
  _ship_value := CASE WHEN _ship_type IN ('fob', 'fob_pre') THEN _ship_cost ELSE 0 END;

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
$function$;

COMMENT ON FUNCTION public.fn_quotes_recalc_subtotal_from_items() IS
  'Onda 17 / item 5.1: recalcula quotes.subtotal/total/discount_amount a partir '
  'de quote_items, aplicando negotiation_markup_percent e discount_percent. '
  'Espelha logica de calculateQuoteTotals do frontend. Skip para approved/converted.';
