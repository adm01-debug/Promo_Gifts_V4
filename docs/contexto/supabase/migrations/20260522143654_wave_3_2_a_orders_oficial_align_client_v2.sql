-- ============================================================================
-- Wave 3.2.A v2 · Oficial · orders alinhamento client_* + total
-- ============================================================================

-- 1) Atualizar trigger function recalc_order_total: total_amount → total
CREATE OR REPLACE FUNCTION public.recalc_order_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE v_order_id uuid;
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);

  UPDATE public.orders o
  SET subtotal = COALESCE((
        SELECT SUM(ROUND(oi.quantity * (oi.unit_price - COALESCE(oi.discount_amount,0) + COALESCE(oi.personalization_cost,0)),2))
        FROM public.order_items oi
        WHERE oi.order_id = v_order_id
      ),0),
      total = ROUND(
        COALESCE((
          SELECT SUM(ROUND(oi.quantity * (oi.unit_price - COALESCE(oi.discount_amount,0) + COALESCE(oi.personalization_cost,0)),2))
          FROM public.order_items oi
          WHERE oi.order_id = v_order_id
        ),0)
        - COALESCE(o.discount_amount,0)
        + COALESCE(o.shipping_cost,0)
        + COALESCE(o.tax_amount,0)
      ,2),
      updated_at = now()
  WHERE o.id = v_order_id;

  RETURN COALESCE(NEW, OLD);
END$function$;

COMMENT ON FUNCTION public.recalc_order_total() IS
  'Refatorada 2026-05-22 (Wave 3.2.A): usa orders.total (consolidado, sem mais total_amount).';

-- 2) DROP `total` (generated) + rename total_amount → total
ALTER TABLE public.orders DROP COLUMN total;
ALTER TABLE public.orders RENAME COLUMN total_amount TO total;

-- 3) DROP colunas customer_* + tracking_code (legacy, tabela vazia)
ALTER TABLE public.orders
  DROP COLUMN IF EXISTS customer_name,
  DROP COLUMN IF EXISTS customer_email,
  DROP COLUMN IF EXISTS customer_phone,
  DROP COLUMN IF EXISTS tracking_code;

-- 4) ADD colunas que faltam (alinhar ao Lovable)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS client_email    text,
  ADD COLUMN IF NOT EXISTS client_phone    text,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS shipping_type   text,
  ADD COLUMN IF NOT EXISTS delivery_time   text;

COMMENT ON COLUMN public.orders.tracking_number IS
  'Wave 3.2.A 2026-05-22: substitui tracking_code (drop). Padrao Lovable.';
COMMENT ON COLUMN public.orders.total IS
  'Wave 3.2.A 2026-05-22: renomeado de total_amount. Consolidacao Lovable.';
