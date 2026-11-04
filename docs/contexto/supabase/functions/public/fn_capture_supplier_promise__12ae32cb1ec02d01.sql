CREATE OR REPLACE FUNCTION public.fn_capture_supplier_promise()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_slot     smallint;
  v_date     date;
  v_qty      integer;
  v_old_date date;
  v_old_qty  integer;
BEGIN
  FOR v_slot IN 1..6 LOOP

    v_date := CASE v_slot
      WHEN 1 THEN NEW.next_date_1 WHEN 2 THEN NEW.next_date_2
      WHEN 3 THEN NEW.next_date_3 WHEN 4 THEN NEW.next_date_4
      WHEN 5 THEN NEW.next_date_5 WHEN 6 THEN NEW.next_date_6
    END;
    v_qty := CASE v_slot
      WHEN 1 THEN NEW.next_quantity_1 WHEN 2 THEN NEW.next_quantity_2
      WHEN 3 THEN NEW.next_quantity_3 WHEN 4 THEN NEW.next_quantity_4
      WHEN 5 THEN NEW.next_quantity_5 WHEN 6 THEN NEW.next_quantity_6
    END;

    IF TG_OP = 'UPDATE' THEN
      v_old_date := CASE v_slot
        WHEN 1 THEN OLD.next_date_1 WHEN 2 THEN OLD.next_date_2
        WHEN 3 THEN OLD.next_date_3 WHEN 4 THEN OLD.next_date_4
        WHEN 5 THEN OLD.next_date_5 WHEN 6 THEN OLD.next_date_6
      END;
      v_old_qty := CASE v_slot
        WHEN 1 THEN OLD.next_quantity_1 WHEN 2 THEN OLD.next_quantity_2
        WHEN 3 THEN OLD.next_quantity_3 WHEN 4 THEN OLD.next_quantity_4
        WHEN 5 THEN OLD.next_quantity_5 WHEN 6 THEN OLD.next_quantity_6
      END;

      -- Slot foi zerado antes de expirar → superseded
      IF (v_old_date IS NOT NULL AND COALESCE(v_old_qty, 0) > 0)
         AND (v_date IS NULL OR COALESCE(v_qty, 0) <= 0)
         AND v_old_date >= (current_date - 15) THEN
        UPDATE public.supplier_replenishment_events
        SET resolution = 'superseded', resolved_at = now(), updated_at = now()
        WHERE source_id = NEW.id AND slot = v_slot
          AND promised_date = v_old_date AND resolution = 'pending';
        CONTINUE;
      END IF;

      -- Sem mudança → skip
      IF (v_old_date IS NOT DISTINCT FROM v_date)
         AND (v_old_qty IS NOT DISTINCT FROM v_qty) THEN
        CONTINUE;
      END IF;
    END IF;

    IF v_date IS NOT NULL AND COALESCE(v_qty, 0) > 0 THEN
      INSERT INTO public.supplier_replenishment_events (
        source_id, supplier_id, variant_id, slot, promised_date, promised_quantity, observed_at
      ) VALUES (
        NEW.id, NEW.supplier_id, NEW.variant_id,
        v_slot, v_date, v_qty, COALESCE(NEW.updated_at, now())
      )
      ON CONFLICT (source_id, slot, promised_date, promised_quantity, observed_at) DO NOTHING;
    END IF;

  END LOOP;
  RETURN NULL;
END;
$function$
