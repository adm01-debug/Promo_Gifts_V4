-- APLICADO: 2026-06-23
-- Objective: enforce NOT NULL on categories.organization_id.
-- Pre-condition: 0 NULLs confirmed by backfill in previous migration.
-- Step 2 of 3: add NOT NULL constraint
ALTER TABLE public.categories
  ALTER COLUMN organization_id
    SET NOT NULL;;
