CREATE OR REPLACE FUNCTION public.fn_prevent_canonical_chain()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_target_canonical uuid;
  v_target_deleted_at timestamptz;
BEGIN
  -- Fetch target's own canonical and deleted_at in a single lookup
  SELECT canonical_image_id, deleted_at
  INTO v_target_canonical, v_target_deleted_at
  FROM public.product_images
  WHERE id = NEW.canonical_image_id;

  -- GAP-J5: target is soft-deleted → clear to prevent C13 violation
  IF v_target_deleted_at IS NOT NULL THEN
    NEW.canonical_image_id := NULL;
    NEW.is_shared := false;
    RETURN NEW;
  END IF;

  -- GAP-D: target is itself a dep (non-root) → flatten to the root
  IF v_target_canonical IS NOT NULL THEN
    NEW.canonical_image_id := v_target_canonical;
  END IF;

  -- Prevent self-referential assignment
  IF NEW.canonical_image_id = NEW.id THEN
    NEW.canonical_image_id := NULL;
    NEW.is_shared := false;
  END IF;

  RETURN NEW;
END;
$function$
