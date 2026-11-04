CREATE OR REPLACE FUNCTION public.fn_sync_workspace_notifications_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  NEW.search_vector := to_tsvector(
    'portuguese',
    COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.message, '')
  );
  RETURN NEW;
END;
$function$
