
-- ============================================================================
-- FIX SISTÊMICO: coerência stock_main_warehouse(+other) <-> quantity (canônico)
-- Causa-raiz: Asia/SM atualizam apenas `quantity`; `stock_main_warehouse` ficava
-- congelado na ingestão. A camada de inteligência (snapshot, sumário diário,
-- market intelligence, MVs) lê main+other -> ficava cega/errada p/ Asia e SM.
-- Solução write-path-independent: trigger BEFORE que espelha quantity->main
-- quando o writer não tocou o split de armazém (Asia/SM/manual), sem interferir
-- em XBZ/Spot (que setam main explicitamente).
-- ============================================================================

-- 1) Guard de sessão no trigger de snapshot (permite supressão controlada em
--    correções em massa, sem DISABLE TRIGGER / sem lock ACCESS EXCLUSIVE).
CREATE OR REPLACE FUNCTION public.fn_capture_stock_snapshot()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_product_id    uuid;
  v_stock_changed boolean;
  v_price_changed boolean;
  v_date_changed  boolean;
  v_change_type   varchar(20);
BEGIN
  -- Supressão controlada (correções em massa): SET LOCAL app.skip_stock_snapshot='true'
  IF current_setting('app.skip_stock_snapshot', true) = 'true' THEN
    RETURN NEW;
  END IF;

  v_stock_changed := (
    OLD.stock_main_warehouse  IS DISTINCT FROM NEW.stock_main_warehouse
    OR OLD.stock_other_warehouses IS DISTINCT FROM NEW.stock_other_warehouses
  );
  v_price_changed := (OLD.cost_price IS DISTINCT FROM NEW.cost_price);
  v_date_changed  := (OLD.next_date_1 IS DISTINCT FROM NEW.next_date_1);

  IF NOT v_stock_changed AND NOT v_price_changed AND NOT v_date_changed THEN
    RETURN NEW;
  END IF;

  IF v_stock_changed AND v_price_changed THEN
    v_change_type := 'both';
  ELSIF v_price_changed THEN
    v_change_type := 'price';
  ELSIF v_date_changed AND NOT v_stock_changed THEN
    v_change_type := 'restock_date';
  ELSE
    v_change_type := 'stock';
  END IF;

  SELECT pv.product_id INTO v_product_id
  FROM product_variants pv WHERE pv.id = NEW.variant_id;

  IF v_product_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO stock_snapshots (
    variant_supplier_source_id, supplier_id, supplier_branch_id,
    variant_id, product_id,
    stock_main_old, stock_main_new,
    stock_other_old, stock_other_new,
    cost_price_old, cost_price_new,
    change_type, captured_at, sync_source
  ) VALUES (
    NEW.id, NEW.supplier_id, NEW.supplier_branch_id,
    NEW.variant_id, v_product_id,
    CASE WHEN v_stock_changed THEN OLD.stock_main_warehouse  ELSE NULL END,
    CASE WHEN v_stock_changed THEN NEW.stock_main_warehouse  ELSE NULL END,
    CASE WHEN v_stock_changed THEN OLD.stock_other_warehouses ELSE NULL END,
    CASE WHEN v_stock_changed THEN NEW.stock_other_warehouses ELSE NULL END,
    CASE WHEN v_price_changed THEN OLD.cost_price ELSE NULL END,
    CASE WHEN v_price_changed THEN NEW.cost_price ELSE NULL END,
    v_change_type, now(), NEW.source
  );

  RETURN NEW;
END;
$function$;

-- 2) Trigger-espelho: mantém stock_main_warehouse(+other) coerente com `quantity`
CREATE OR REPLACE FUNCTION public.fn_vss_sync_warehouse_from_qty()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- split não informado (ambos 0) mas há quantity -> espelha
    IF COALESCE(NEW.stock_main_warehouse,0) = 0
       AND COALESCE(NEW.stock_other_warehouses,0) = 0
       AND COALESCE(NEW.quantity,0) <> 0 THEN
      NEW.stock_main_warehouse  := COALESCE(NEW.quantity,0);
      NEW.stock_other_warehouses := 0;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- quantity mudou E o split NÃO foi tocado neste UPDATE (Asia/SM/manual)
    IF NEW.quantity IS DISTINCT FROM OLD.quantity
       AND NEW.stock_main_warehouse  IS NOT DISTINCT FROM OLD.stock_main_warehouse
       AND NEW.stock_other_warehouses IS NOT DISTINCT FROM OLD.stock_other_warehouses THEN
      NEW.stock_main_warehouse  := COALESCE(NEW.quantity,0);
      NEW.stock_other_warehouses := 0;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_vss_sync_warehouse_from_qty ON public.variant_supplier_sources;
CREATE TRIGGER trg_vss_sync_warehouse_from_qty
  BEFORE INSERT OR UPDATE OF quantity ON public.variant_supplier_sources
  FOR EACH ROW EXECUTE FUNCTION public.fn_vss_sync_warehouse_from_qty();
;
