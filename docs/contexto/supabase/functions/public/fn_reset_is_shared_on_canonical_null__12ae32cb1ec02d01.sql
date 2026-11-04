CREATE OR REPLACE FUNCTION public.fn_reset_is_shared_on_canonical_null()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NEW.canonical_image_id IS NULL AND OLD.canonical_image_id IS NOT NULL THEN
    NEW.is_shared := false;
    NEW.last_modified_source := COALESCE(NULLIF(NEW.last_modified_source, ''), 'edge_function');
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$function$
