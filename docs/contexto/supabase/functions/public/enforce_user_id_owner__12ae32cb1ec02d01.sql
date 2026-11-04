CREATE OR REPLACE FUNCTION public.enforce_user_id_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Enforça que user_id corresponda ao auth.uid() em inserts/updates
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  ELSIF NEW.user_id != auth.uid() AND NOT public.is_admin_or_above(auth.uid()) THEN
    RAISE EXCEPTION 'user_id deve corresponder ao usuário autenticado';
  END IF;
  RETURN NEW;
END;
$function$
