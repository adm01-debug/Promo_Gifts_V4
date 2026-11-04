CREATE OR REPLACE FUNCTION public.fn_ensure_seller_discount_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.role = 'vendedor'::public.app_role THEN
    INSERT INTO public.seller_discount_limits (user_id, max_discount_percent, set_by, notes)
    VALUES (
      NEW.user_id, 
      0,
      COALESCE(NEW.granted_by, NEW.user_id),
      'Limite criado automaticamente quando user virou vendedor (A1-2). Admin deve configurar valor real.'
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$
