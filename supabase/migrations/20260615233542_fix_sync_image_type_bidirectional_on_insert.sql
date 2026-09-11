
-- FIX 14: Make image_type ↔ image_type_id sync bidirectional and cover INSERT.
-- Current bug: trigger only runs on UPDATE, so INSERT rows get image_type_id='other'
-- even when image_type='main'. On the first UPDATE the SEO trigger overwrites image_type to 'other'.

-- Priority rule:
--   image_type_id explicitly set (non-'other') → trusted, update text
--   image_type text explicitly set (non-'gallery' default) → lookup UUID
--   both at defaults → still sync text→UUID so 'gallery' gets the correct UUID

CREATE OR REPLACE FUNCTION public.fn_sync_image_type_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
DECLARE
  OTHER_UUID CONSTANT uuid := '953d054a-3bbc-4954-a319-b3c806ac596f';
  v_code text;
  v_id   uuid;
BEGIN
  -- Branch A: image_type_id is explicitly non-'other' → it is authoritative
  IF NEW.image_type_id IS NOT NULL AND NEW.image_type_id <> OTHER_UUID THEN
    SELECT code INTO v_code FROM image_types WHERE id = NEW.image_type_id;
    IF v_code IS NOT NULL THEN
      NEW.image_type := v_code;
    END IF;

  -- Branch B: image_type_id is missing or 'other' → use text to look up UUID
  ELSE
    SELECT id INTO v_id FROM image_types WHERE code = LOWER(COALESCE(NEW.image_type, 'gallery'));
    IF v_id IS NOT NULL THEN
      NEW.image_type_id := v_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Drop existing trigger (UPDATE only) and recreate for INSERT + UPDATE
DROP TRIGGER IF EXISTS trg_sync_image_type_code ON public.product_images;

CREATE TRIGGER trg_sync_image_type_code
  BEFORE INSERT OR UPDATE OF image_type, image_type_id
  ON public.product_images
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_image_type_code();

-- Backfill: fix the ~432 rows where image_type='gallery' but image_type_id='other'
-- (rows inserted before this fix where the column defaults collided)
UPDATE public.product_images
SET image_type_id = (SELECT id FROM public.image_types WHERE code = LOWER(image_type) LIMIT 1)
WHERE image_type_id = '953d054a-3bbc-4954-a319-b3c806ac596f'
  AND image_type != 'other'
  AND EXISTS (SELECT 1 FROM public.image_types WHERE code = LOWER(product_images.image_type));
;
