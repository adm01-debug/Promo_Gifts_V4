-- Migration: 20260511235959_add_categories_full_path_readable_drift
-- Rollback: supabase/rollbacks/20260511235959_rollback.sql (espelho: no-op — a coluna já existia em produção)
-- Context: categories.full_path_readable foi adicionada diretamente em produção (out-of-band)
-- sem migration registrada. A migration 20260512000000_bootstrap_missing_application_schemas
-- cria as views classification_audit.v_gaps_acionaveis e v_kits_para_revisao que referenciam
-- categories.full_path_readable em DDL direto — sem esta migration anterior, o shadow DB da
-- Supabase Preview falha com "column categories.full_path_readable does not exist".
-- Esta migration é idempotente (IF NOT EXISTS): no-op em produção onde a coluna já existe.

DO $precondition$
BEGIN
    -- Verifica que a tabela categories existe (precondição básica)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'categories'
    ) THEN
        RAISE EXCEPTION 'Precondição falhou: tabela public.categories não existe';
    END IF;
END $precondition$;

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS full_path_readable TEXT;

DO $postcondition$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name  = 'categories'
          AND column_name = 'full_path_readable'
    ) THEN
        RAISE EXCEPTION 'Pós-condição falhou: coluna categories.full_path_readable não foi criada';
    END IF;
END $postcondition$;
