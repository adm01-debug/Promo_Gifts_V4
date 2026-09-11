-- APLICADO: 2026-06-23
-- Objective: belt-and-suspenders trigger that converts explicit NULL to default org
-- on INSERT. Handles the one edge case DEFAULT cannot: INSERT ... VALUES (NULL, ...).
-- Step 3 of 3: defensive BEFORE INSERT trigger
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_categories_default_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Normalizar organization_id NULL para a organização padrão
  -- (handles explicit NULL from ETL/bots/migration scripts)
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := '5db5aee1-064b-4ef4-9193-345dcd8274ea';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger dispara apenas em INSERT (UPDATE protegido pelo NOT NULL + RLS)
DROP TRIGGER IF EXISTS trg_categories_default_organization ON public.categories;
CREATE TRIGGER trg_categories_default_organization
  BEFORE INSERT ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_categories_default_organization();

COMMENT ON FUNCTION public.fn_categories_default_organization() IS
  'Belt-and-suspenders: auto-fills organization_id = Promobrind when NULL on INSERT. '
  'Defensive layer on top of column DEFAULT + NOT NULL constraint. '
  'Created: 2026-06-23 — part of categories.organization_id hardening.';

-- Notificar PostgREST para recarregar o schema (nova função + trigger DDL)
NOTIFY pgrst, 'reload schema';;
