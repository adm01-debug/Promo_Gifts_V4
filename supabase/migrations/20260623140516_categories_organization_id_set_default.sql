-- APLICADO: 2026-06-23
-- Objective: blind the categories.organization_id column against future NULL inserts.
-- Step 1 of 3: add DEFAULT value (aligns with product_images / product_videos pattern)
ALTER TABLE public.categories
  ALTER COLUMN organization_id
    SET DEFAULT '5db5aee1-064b-4ef4-9193-345dcd8274ea';;
