-- The legacy public.categories bootstrap also omitted display_order. The
-- analytics bootstrap at 20260512000000 reads it when building the category
-- tree, so fresh and incremental preview databases need this mirror first.
-- Production already has the column; this remains a no-op there.

DO $precondition$
BEGIN
  IF to_regclass('public.categories') IS NULL THEN
    RAISE EXCEPTION 'Precondition failed: public.categories does not exist';
  END IF;
END;
$precondition$;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

DO $postcondition$
BEGIN
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

