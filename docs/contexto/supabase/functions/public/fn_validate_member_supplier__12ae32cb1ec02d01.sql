CREATE OR REPLACE FUNCTION public.fn_validate_member_supplier()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_real_supplier uuid;
BEGIN
  SELECT supplier_id INTO v_real_supplier
  FROM products WHERE id = NEW.product_id;
  IF v_real_supplier IS NULL THEN
    RAISE EXCEPTION 'Produto % não encontrado na tabela products', NEW.product_id;
  END IF;
  NEW.supplier_id := v_real_supplier;
  RETURN NEW;
END;
$function$
