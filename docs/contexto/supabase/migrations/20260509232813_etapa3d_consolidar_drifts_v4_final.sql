-- ============================================================
-- Etapa 3D v4 — Consolidação FINAL
-- Drop triggers de sincronia legacy ANTES de dropar colunas
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- BLOCO 0: Dropar triggers/funções de sincronia legacy
-- ════════════════════════════════════════════════════════════
DROP TRIGGER IF EXISTS trg_quotes_init_discount_insert ON public.quotes;
DROP TRIGGER IF EXISTS trg_quotes_sync_discount_update ON public.quotes;
DROP FUNCTION IF EXISTS public.fn_quotes_init_discount_alias() CASCADE;
DROP FUNCTION IF EXISTS public.fn_quotes_sync_discount_alias() CASCADE;

-- ════════════════════════════════════════════════════════════
-- BLOCO 1: Migrar display_order → sort_order
-- ════════════════════════════════════════════════════════════
UPDATE public.quote_items 
SET sort_order = display_order 
WHERE display_order IS NOT NULL 
  AND (sort_order IS NULL OR sort_order = 0);

-- ════════════════════════════════════════════════════════════
-- BLOCO 2: DROP colunas legacy duplicadas
-- ════════════════════════════════════════════════════════════
ALTER TABLE public.quotes      DROP COLUMN discount_percentage;
ALTER TABLE public.quotes      DROP COLUMN delivery_terms;
ALTER TABLE public.quote_items DROP COLUMN display_order;

-- ════════════════════════════════════════════════════════════
-- BLOCO 3: Trigger calcula real_subtotal e real_discount_percent
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_quotes_calc_real_values()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_markup numeric;
BEGIN
  v_markup := LEAST(50, GREATEST(0, COALESCE(NEW.negotiation_markup_percent, 0)));
  NEW.negotiation_markup_percent := v_markup;
  
  IF v_markup > 0 THEN
    NEW.real_subtotal := ROUND(NEW.subtotal / (1 + v_markup / 100.0), 2);
  ELSE
    NEW.real_subtotal := NEW.subtotal;
  END IF;
  
  IF NEW.real_subtotal > 0 THEN
    NEW.real_discount_percent := ROUND(
      ((NEW.real_subtotal - (NEW.subtotal - COALESCE(NEW.discount_amount, 0))) / NEW.real_subtotal) * 100,
      2
    );
  ELSE
    NEW.real_discount_percent := 0;
  END IF;
  
  RETURN NEW;
END $$;

CREATE TRIGGER trg_quotes_calc_real_values
  BEFORE INSERT OR UPDATE OF subtotal, discount_amount, negotiation_markup_percent
  ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.fn_quotes_calc_real_values();

COMMENT ON FUNCTION public.fn_quotes_calc_real_values IS
  'Calcula real_subtotal e real_discount_percent (read-only). Servidor sempre confiável (cliente não pode burlar).';

-- Recalcular real_subtotal/real_discount_percent nas 3 rows existentes
UPDATE public.quotes SET subtotal = subtotal WHERE id IS NOT NULL;

-- ════════════════════════════════════════════════════════════
-- BLOCO 4: Trigger calcula subtotal em quote_items
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_quote_items_calc_subtotal()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.subtotal := COALESCE(NEW.quantity, 0) * COALESCE(NEW.unit_price, 0)
                + COALESCE(NEW.personalization_cost, 0)
                - COALESCE(NEW.discount_amount, 0);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_quote_items_calc_subtotal
  BEFORE INSERT OR UPDATE OF quantity, unit_price, personalization_cost, discount_amount
  ON public.quote_items
  FOR EACH ROW EXECUTE FUNCTION public.fn_quote_items_calc_subtotal();

COMMENT ON FUNCTION public.fn_quote_items_calc_subtotal IS
  'Calcula subtotal: (quantity*unit_price) + personalization_cost - discount_amount. Resolve bug do hook que não envia subtotal.';

-- Recalcular subtotal nas 6 rows existentes
UPDATE public.quote_items SET quantity = quantity WHERE id IS NOT NULL;

-- ════════════════════════════════════════════════════════════
-- BLOCO 5: Tabela quote_item_personalizations
-- ════════════════════════════════════════════════════════════
CREATE TABLE public.quote_item_personalizations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_item_id         uuid NOT NULL REFERENCES public.quote_items(id) ON DELETE CASCADE,
  technique_id          uuid,
  technique_name        text,
  colors_count          integer NOT NULL DEFAULT 1 CHECK (colors_count > 0),
  positions_count       integer NOT NULL DEFAULT 1 CHECK (positions_count > 0),
  area_cm2              numeric,
  width_cm              numeric,
  height_cm             numeric,
  personalized_quantity integer,
  setup_cost            numeric NOT NULL DEFAULT 0 CHECK (setup_cost >= 0),
  unit_cost             numeric NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  total_cost            numeric NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_qip_quote_item ON public.quote_item_personalizations(quote_item_id);
CREATE INDEX idx_qip_technique  ON public.quote_item_personalizations(technique_id);

ALTER TABLE public.quote_item_personalizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qip_select_own_quote"
  ON public.quote_item_personalizations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quote_items qi
      JOIN public.quotes q ON q.id = qi.quote_id
      WHERE qi.id = quote_item_personalizations.quote_item_id
        AND (q.seller_id = auth.uid() OR public.is_supervisor_or_above(auth.uid()))
    )
  );

CREATE POLICY "qip_insert_own_quote"
  ON public.quote_item_personalizations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quote_items qi
      JOIN public.quotes q ON q.id = qi.quote_id
      WHERE qi.id = quote_item_personalizations.quote_item_id
        AND q.seller_id = auth.uid()
    )
  );

CREATE POLICY "qip_update_own_quote"
  ON public.quote_item_personalizations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quote_items qi
      JOIN public.quotes q ON q.id = qi.quote_id
      WHERE qi.id = quote_item_personalizations.quote_item_id
        AND q.seller_id = auth.uid()
    )
  );

CREATE POLICY "qip_delete_own_quote"
  ON public.quote_item_personalizations FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quote_items qi
      JOIN public.quotes q ON q.id = qi.quote_id
      WHERE qi.id = quote_item_personalizations.quote_item_id
        AND (q.seller_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

CREATE TRIGGER trg_qip_updated_at BEFORE UPDATE ON public.quote_item_personalizations
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE public.quote_item_personalizations IS
  'Personalização (gravação) de cada item de orçamento. Cada item pode ter múltiplas técnicas/posições. Cascateia delete com quote_items.';
