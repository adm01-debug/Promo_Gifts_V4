CREATE OR REPLACE FUNCTION public.enforce_seller_id_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Força seller_id ao auth.uid() na inserção (impede impersonação)
  IF NEW.seller_id IS NULL OR NEW.seller_id <> auth.uid() THEN
    NEW.seller_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$function$
