CREATE OR REPLACE FUNCTION public.fn_handle_canonical_root_soft_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_new_root uuid;
BEGIN
  -- Find oldest active dep to promote
  SELECT id INTO v_new_root
  FROM public.product_images
  WHERE canonical_image_id = NEW.id
    AND deleted_at IS NULL
  ORDER BY created_at ASC, id ASC
  LIMIT 1;

  IF v_new_root IS NOT NULL THEN
    -- Promote oldest dep to root (canonical=NULL, is_shared=false)
    UPDATE public.product_images
    SET canonical_image_id = NULL,
        is_shared = false,
        last_modified_source = 'edge_function',
        updated_at = now()
    WHERE id = v_new_root;

    -- Re-point other deps to new root
    UPDATE public.product_images
    SET canonical_image_id = v_new_root,
        last_modified_source = 'edge_function',
        updated_at = now()
    WHERE canonical_image_id = NEW.id
      AND id <> v_new_root
      AND deleted_at IS NULL;
  END IF;

  RETURN NEW;
END;
$function$
