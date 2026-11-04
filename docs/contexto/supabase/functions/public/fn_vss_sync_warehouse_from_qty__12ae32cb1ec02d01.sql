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
$function$
