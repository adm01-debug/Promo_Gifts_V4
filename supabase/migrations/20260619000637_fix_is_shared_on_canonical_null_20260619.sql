-- GAP FIX: When FK ON DELETE SET NULL clears canonical_image_id, also reset is_shared
-- Prevents C09 violation (is_shared=true must have canonical_image_id).

CREATE OR REPLACE FUNCTION public.fn_reset_is_shared_on_canonical_null()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.canonical_image_id IS NULL AND OLD.canonical_image_id IS NOT NULL THEN
    NEW.is_shared := false;
    NEW.last_modified_source := COALESCE(NULLIF(NEW.last_modified_source, ''), 'edge_function');
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_reset_is_shared_on_canonical_null() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_reset_is_shared_on_canonical_null() TO service_role;

DROP TRIGGER IF EXISTS trg_reset_is_shared_on_canonical_null ON public.product_images;
CREATE TRIGGER trg_reset_is_shared_on_canonical_null
  BEFORE UPDATE OF canonical_image_id
  ON public.product_images
  FOR EACH ROW
  WHEN (NEW.canonical_image_id IS NULL AND OLD.canonical_image_id IS NOT NULL)
  EXECUTE FUNCTION public.fn_reset_is_shared_on_canonical_null();;
