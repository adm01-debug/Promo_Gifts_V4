CREATE OR REPLACE FUNCTION public.fn_handle_image_restoration()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_canon_deleted boolean;
BEGIN
  -- Only act on restoration (deleted → live)
  IF NEW.deleted_at IS NOT NULL OR OLD.deleted_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- If image has a canonical assignment, check if that root is still alive
  IF NEW.canonical_image_id IS NOT NULL THEN
    SELECT (deleted_at IS NOT NULL) INTO v_canon_deleted
    FROM public.product_images
    WHERE id = NEW.canonical_image_id;

    IF v_canon_deleted IS TRUE THEN
      -- Stale canonical: canonical was deleted after this dep was soft-deleted.
      -- Detach: make this image a standalone root.
      NEW.canonical_image_id := NULL;
      NEW.is_shared := false;
      NEW.last_modified_source := COALESCE(NULLIF(NEW.last_modified_source, ''), 'edge_function');
      NEW.updated_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
