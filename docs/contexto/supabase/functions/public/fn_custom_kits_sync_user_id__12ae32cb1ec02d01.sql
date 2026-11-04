CREATE OR REPLACE FUNCTION public.fn_custom_kits_sync_user_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  -- created_by não existe mais no schema; preencher user_id do JWT se vazio
  IF NEW.user_id IS NULL THEN
    BEGIN
      NEW.user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
  RETURN NEW;
END $function$
