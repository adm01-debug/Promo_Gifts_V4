CREATE OR REPLACE FUNCTION public.fn_validate_selected_packaging()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.selected_packaging_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE id=NEW.selected_packaging_id AND product_type='packaging' AND is_active) THEN
      RAISE EXCEPTION 'selected_packaging_id % nao referencia produto type=packaging ativo', NEW.selected_packaging_id;
    END IF;
  END IF;
  RETURN NEW;
END$function$
