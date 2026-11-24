-- Fixture reduzido para o teste de transições de status de orçamento.
-- Sem dados reais. Reproduz apenas o necessário para exercitar
-- public.fn_quotes_enforce_immutability sobre public.quotes.
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
  created_by uuid,
  assigned_to uuid,
  status text DEFAULT 'draft'::text,
  subtotal numeric(10,2) DEFAULT 0,
  discount_percent numeric(5,2) DEFAULT 0,
  discount_amount numeric(10,2) DEFAULT 0,
  negotiation_markup_percent numeric(5,2) DEFAULT 0,
  real_subtotal numeric(10,2) DEFAULT 0,
  real_discount_percent numeric(5,2) DEFAULT 0,
  shipping_cost numeric(10,2) DEFAULT 0,
  tax_amount numeric(10,2) DEFAULT 0,
  total numeric(10,2) DEFAULT 0,
  seller_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-0000000000aa',
  organization_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-0000000000bb',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Cópia fiel do CHECK de produção (supabase/migrations-snapshot/SCHEMA_LIVE.sql:8940).
ALTER TABLE public.quotes ADD CONSTRAINT valid_quote_status
  CHECK (status = ANY (ARRAY[
    'draft','pending','pending_approval','sent','viewed',
    'approved','converted','rejected','expired','cancelled'
  ]::text[]));

-- Cópia fiel do corpo de produção (SCHEMA_LIVE.sql:38779). NÃO corrigir aqui:
-- o propósito da etapa 093 é provar o defeito, e a etapa 094 é a migration.
CREATE OR REPLACE FUNCTION public.fn_quotes_enforce_immutability() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _msg text;
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
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

CREATE TRIGGER trg_quotes_immutability BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.fn_quotes_enforce_immutability();
