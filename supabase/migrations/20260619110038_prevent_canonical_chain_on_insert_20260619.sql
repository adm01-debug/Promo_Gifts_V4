
-- Migration: prevent_canonical_chain_on_insert_20260619
-- Purpose: Close GAP-J — fn_prevent_canonical_chain only fired on UPDATE.
-- A direct INSERT with canonical_image_id pointing to a dep creates a chain.
-- Fix: extend the same function to also fire BEFORE INSERT when canonical IS NOT NULL.

BEGIN;

DROP TRIGGER IF EXISTS trg_prevent_canonical_chain_insert ON public.product_images;
CREATE TRIGGER trg_prevent_canonical_chain_insert
  BEFORE INSERT ON public.product_images
  FOR EACH ROW
  WHEN (NEW.canonical_image_id IS NOT NULL)
  EXECUTE FUNCTION public.fn_prevent_canonical_chain();

COMMIT;
;
