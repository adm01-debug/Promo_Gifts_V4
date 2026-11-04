CREATE OR REPLACE FUNCTION public.limit_recently_viewed_items()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Mantém apenas os 50 últimos vistos por usuário
  DELETE FROM public.recently_viewed_products
  WHERE user_id = NEW.user_id
    AND id NOT IN (
      SELECT id FROM public.recently_viewed_products
      WHERE user_id = NEW.user_id
      ORDER BY viewed_at DESC
      LIMIT 50
    );
  RETURN NEW;
END;
$function$
