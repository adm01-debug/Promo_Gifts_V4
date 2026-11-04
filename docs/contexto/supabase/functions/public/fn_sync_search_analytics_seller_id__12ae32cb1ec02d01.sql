CREATE OR REPLACE FUNCTION public.fn_sync_search_analytics_seller_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.seller_id := NEW.user_id;
  RETURN NEW;
END;
$function$
