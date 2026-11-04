-- ============================================================================
-- Wave 3.1.B · Oficial · adicionar colunas para alinhar ao Lovable
-- ============================================================================

-- 1) organizations +6 (cuidado: slug é UNIQUE NOT NULL no Lovable)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS slug        text,
  ADD COLUMN IF NOT EXISTS logo_url    text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS is_active   boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS settings    jsonb   DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz DEFAULT now() NOT NULL;

-- Backfill slug do registro existente (Promobrind)
UPDATE public.organizations
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Agora aplicar NOT NULL + UNIQUE no slug
ALTER TABLE public.organizations
  ALTER COLUMN slug SET NOT NULL;

-- UNIQUE constraint (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='organizations_slug_key'
      AND conrelid='public.organizations'::regclass
  ) THEN
    ALTER TABLE public.organizations ADD CONSTRAINT organizations_slug_key UNIQUE (slug);
  END IF;
END$$;

COMMENT ON COLUMN public.organizations.slug IS
  'Alinhado ao Lovable em 2026-05-22 (Wave 3.1.B). Identificador URL-safe da organizacao.';

-- 2) product_sync_logs +5
ALTER TABLE public.product_sync_logs
  ADD COLUMN IF NOT EXISTS products_received integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS products_created  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS products_updated  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS products_failed   integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_at      timestamptz;

COMMENT ON COLUMN public.product_sync_logs.products_received IS
  'Alinhado ao Lovable 2026-05-22 (Wave 3.1.B). Total recebido do fornecedor.';

-- 3) system_settings +1
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS description text;

COMMENT ON COLUMN public.system_settings.description IS
  'Alinhado ao Lovable 2026-05-22 (Wave 3.1.B). Descricao legivel da configuracao.';
