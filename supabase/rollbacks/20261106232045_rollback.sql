-- Rollback for 20261106232045_fix_handle_updated_at_search_path.sql

ALTER FUNCTION public.handle_updated_at()
  RESET search_path;
