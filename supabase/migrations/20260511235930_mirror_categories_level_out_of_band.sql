-- Fresh database replays create public.categories from the legacy 2025
-- bootstrap, which did not include the hierarchy level/display-order columns.
-- Production already has both columns, but the analytics bootstrap immediately
-- following this migration reads them while creating categories_tree_visual.
-- Keep this migration immediately before 20260512000000 so both fresh replay
-- and the canonical database converge without destructive changes.

DO $precondition$
BEGIN
  IF to_regclass('public.categories') IS NULL THEN
    RAISE EXCEPTION 'Precondition failed: public.categories does not exist';
  END IF;
END;
$precondition$;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS level integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

DO $postcondition$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'categories'
      AND column_name = 'level'
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: public.categories.level does not exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'categories'
      AND column_name = 'display_order'
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: public.categories.display_order does not exist';
  END IF;
END;
$postcondition$;

