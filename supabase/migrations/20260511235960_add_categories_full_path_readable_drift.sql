-- Migration: 20260511235960_add_categories_full_path_readable_drift
-- Rollback: ALTER TABLE public.categories DROP COLUMN IF EXISTS full_path_readable;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS full_path_readable TEXT;
