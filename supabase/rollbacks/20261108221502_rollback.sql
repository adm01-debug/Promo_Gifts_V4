-- Rollback da migration 20261108221502_ft088_fn_check_item_fits
DROP FUNCTION IF EXISTS public.fn_check_item_fits(uuid, uuid, numeric);
