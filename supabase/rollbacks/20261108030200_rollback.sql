-- Rollback FT-088: remove function fn_check_item_fits
DROP FUNCTION IF EXISTS public.fn_check_item_fits(uuid, uuid, numeric);
