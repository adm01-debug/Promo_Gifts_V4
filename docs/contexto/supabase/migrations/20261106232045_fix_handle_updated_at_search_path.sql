-- Fix Supabase advisor 0011 for the trigger function used by stock_notes.
-- Rollback: supabase/rollbacks/20261106232045_rollback.sql

ALTER FUNCTION public.handle_updated_at()
  SET search_path = public
