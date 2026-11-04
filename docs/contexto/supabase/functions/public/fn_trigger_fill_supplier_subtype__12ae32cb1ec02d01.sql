CREATE OR REPLACE FUNCTION public.fn_trigger_fill_supplier_subtype()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Preencher supplier_subtype automaticamente se NULL via main_category_id
  IF NEW.is_active = true AND NEW.supplier_subtype IS NULL AND NEW.main_category_id IS NOT NULL THEN
    SELECT name INTO NEW.supplier_subtype FROM categories WHERE id = NEW.main_category_id;
  END IF;
  RETURN NEW;
END;
$function$
