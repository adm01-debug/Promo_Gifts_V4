-- Fixture reduzido para o teste do invariante de desconto em public.quotes.
-- Sem dados reais. Reproduz apenas as duas funcoes de producao envolvidas:
--   * public.fn_quote_items_calc_subtotal           (SCHEMA_LIVE.sql:38710)
--   * public.fn_quotes_recalc_subtotal_from_items   (SCHEMA_LIVE.sql:38853)
-- NÃO corrigir aqui: o proposito da etapa 108 e provar o defeito; a etapa 109
-- e a migration.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text NOT NULL,
  client_id uuid,
  client_name text NOT NULL,
  status text DEFAULT 'draft'::text,
  subtotal numeric(10,2) DEFAULT 0,
  discount_percent numeric(5,2) DEFAULT 0,
  discount_amount numeric(10,2) DEFAULT 0,
  negotiation_markup_percent numeric(5,2) DEFAULT 0,
  shipping_type text,
  shipping_cost numeric(10,2) DEFAULT 0,
  total numeric(10,2) DEFAULT 0,
  seller_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-0000000000aa',
  organization_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-0000000000bb',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.quotes ADD CONSTRAINT valid_quote_status
  CHECK (status = ANY (ARRAY[
    'draft','pending','pending_approval','sent','viewed',
    'approved','converted','rejected','expired','cancelled'
  ]::text[]));

CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_id text,
  product_name text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  personalization_cost numeric(12,2) DEFAULT 0,
  discount_percentage numeric(5,2) DEFAULT 0,
  discount_amount numeric(12,2) DEFAULT 0,
  subtotal numeric(12,2) DEFAULT 0,
  sort_order integer DEFAULT 0
);

-- Copia fiel do corpo de producao.
CREATE OR REPLACE FUNCTION public.fn_quote_items_calc_subtotal() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
BEGIN
  NEW.subtotal := COALESCE(NEW.quantity, 0) * COALESCE(NEW.unit_price, 0)
                + COALESCE(NEW.personalization_cost, 0)
                - COALESCE(NEW.discount_amount, 0);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_quote_items_calc_subtotal
  BEFORE INSERT OR UPDATE OF quantity, unit_price, personalization_cost, discount_amount
  ON public.quote_items FOR EACH ROW EXECUTE FUNCTION public.fn_quote_items_calc_subtotal();

-- Copia fiel do corpo de producao.
CREATE OR REPLACE FUNCTION public.fn_quotes_recalc_subtotal_from_items() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

  IF _quote_status IN ('approved', 'converted') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(quantity * unit_price + COALESCE(personalization_cost, 0)), 0)
  INTO _real_subtotal
  FROM public.quote_items
  WHERE quote_id = _quote_id;

  _new_subtotal := ROUND(_real_subtotal * (1 + _markup / 100.0), 2);

  IF _disc_pct > 0 THEN
    _disc_value := ROUND(_new_subtotal * (_disc_pct / 100.0), 2);
  ELSE
    _disc_value := _disc_amount_db;
  END IF;

  _ship_value := CASE WHEN _ship_type = 'fob_pre' THEN _ship_cost ELSE 0 END;

  _new_total := _new_subtotal - _disc_value + _ship_value;

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
$$;

CREATE TRIGGER trg_quotes_recalc_from_items
  AFTER INSERT OR DELETE OR UPDATE ON public.quote_items
  FOR EACH ROW EXECUTE FUNCTION public.fn_quotes_recalc_subtotal_from_items();