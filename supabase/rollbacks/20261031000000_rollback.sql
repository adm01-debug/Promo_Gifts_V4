-- Rollback: 20261031000000_create_stock_notes.sql
DROP TRIGGER IF EXISTS set_stock_notes_updated_at ON public.stock_notes;
DROP TABLE IF EXISTS public.stock_notes;
