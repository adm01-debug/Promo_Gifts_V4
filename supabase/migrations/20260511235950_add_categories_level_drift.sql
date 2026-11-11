-- Migration: 20260511235950_add_categories_level_drift
-- Rollback: ALTER TABLE public.categories DROP COLUMN IF EXISTS "level";
-- Context: categories.level foi adicionado diretamente em produção (out-of-band) sem migration.
-- A migration 20260512000000_bootstrap_missing_application_schemas cria views que referenciam
-- categories.level — sem esta migration anterior, o shadow DB da Supabase Preview falha com
-- "column categories.level does not exist (SQLSTATE 42703)".
-- Esta migration é idempotente (IF NOT EXISTS): no-op em produção onde a coluna já existe.
-- Produção: level integer NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 10)

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS "level" integer NOT NULL DEFAULT 1;

-- Adiciona constraint CHECK de forma idempotente (skip se já existir)
DO $$
BEGIN
    ALTER TABLE public.categories
        ADD CONSTRAINT categories_level_check CHECK ("level" >= 1 AND "level" <= 10);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
