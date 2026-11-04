CREATE OR REPLACE FUNCTION public.purge_favorite_trash_old()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_count integer;
BEGIN
  DELETE FROM public.favorite_items_trash 
  WHERE deleted_at < now() - interval '30 days'
  RETURNING 1 INTO v_count;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $function$
