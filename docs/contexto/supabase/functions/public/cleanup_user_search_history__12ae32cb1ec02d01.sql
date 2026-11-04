CREATE OR REPLACE FUNCTION public.cleanup_user_search_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Mantém apenas os 100 últimos searches por usuário (preserva is_pinned)
  DELETE FROM public.user_search_history
  WHERE user_id = NEW.user_id
    AND is_pinned = false
    AND id NOT IN (
      SELECT id FROM public.user_search_history
      WHERE user_id = NEW.user_id AND is_pinned = false
      ORDER BY created_at DESC
      LIMIT 100
    );
  RETURN NEW;
END;
$function$
