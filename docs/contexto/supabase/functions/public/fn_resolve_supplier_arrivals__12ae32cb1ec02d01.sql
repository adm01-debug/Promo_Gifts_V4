CREATE OR REPLACE FUNCTION public.fn_resolve_supplier_arrivals()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_delta         integer;
  v_snapshot_date date;
BEGIN
  -- [C2] usar deltas pré-calculadas
  v_delta := COALESCE(NEW.stock_main_delta, 0) + COALESCE(NEW.stock_other_delta, 0);
  IF v_delta <= 0 THEN RETURN NULL; END IF;

  v_snapshot_date := NEW.captured_at::date;

  -- Idempotência: snapshot já resolveu uma promessa?
  IF EXISTS (
    SELECT 1 FROM public.supplier_replenishment_events
    WHERE arrival_snapshot_id = NEW.id
  ) THEN RETURN NULL; END IF;

  -- Casar com promessa pendente mais próxima
  UPDATE public.supplier_replenishment_events
  SET
    resolution          = 'fulfilled',
    actual_date         = v_snapshot_date,
    actual_quantity     = v_delta,
    resolved_at         = now(),
    arrival_snapshot_id = NEW.id,
    updated_at          = now()
  WHERE id = (
    SELECT id
    FROM public.supplier_replenishment_events
    WHERE source_id  = NEW.variant_supplier_source_id
      AND resolution = 'pending'
      AND ABS(promised_date - v_snapshot_date) <= 15
    ORDER BY
      ABS(promised_date - v_snapshot_date) ASC,
      ABS(COALESCE(promised_quantity, 0) - v_delta) ASC
    LIMIT 1
  );

  RETURN NULL;
END;
$function$
