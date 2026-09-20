-- Onda 0 do plano de execução — achado de emergência (2026-09-20), fora do
-- escopo original dos 2 planos de 50 etapas.
--
-- `db-schema-drift-check` / "Migrations x Canonical schema" falham desde
-- 2026-09-17 (4 execuções diárias consecutivas) com
-- `ERROR: column categories.bitrix_id does not exist (SQLSTATE 42703)`
-- durante `supabase db diff` — não é drift real, é falha no PRÓPRIO rebuild
-- do shadow DB usado para o diff.
--
-- Causa raiz: `public.categories.bitrix_id` existe no banco canônico ao
-- vivo (confirmado: integer, nullable, `UNIQUE (bitrix_id)` via constraint
-- `categories_bitrix_id_key`), mas NENHUMA migration em
-- `supabase/migrations/` cria essa coluna — grep confirma 0 ocorrências de
-- `ADD COLUMN.*bitrix_id`. É DDL out-of-band (mesma categoria dos achados
-- de `ai_providers.secret_name` e `zapp_catalog_stats` já tratados nos
-- Pacotes de Aprovação #1/#2), só que este quebra o `db diff` porque a
-- migration `20260512000000_bootstrap_missing_application_schemas.sql`
-- SELECIONA `categories.bitrix_id` assumindo que já existe — no shadow DB
-- (rebuild do zero, sem a DDL out-of-band) a coluna nunca foi criada até
-- ali, e o diff quebra com erro de SQL (não com "drift detectado").
--
-- Esta migration é datada ANTES de 20260512000000 de propósito — o rebuild
-- do shadow DB aplica os arquivos em ordem de nome de arquivo, então
-- precisa existir e ser aplicada antes daquela migration para o SELECT
-- funcionar. No banco canônico (onde a coluna já existe), é 100% no-op
-- (IF NOT EXISTS em tudo).
--
-- Aplicado via E15 (.github/workflows/db-apply-migration.yml) — nunca
-- supabase db push nem execute_sql direto no canônico.

DO $precondition$
BEGIN
  IF to_regclass('public.categories') IS NULL THEN
    RAISE EXCEPTION 'Precondição falhou: public.categories não existe';
  END IF;
END;
$precondition$;

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS bitrix_id integer;

DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'categories_bitrix_id_key'
      AND conrelid = 'public.categories'::regclass
  ) THEN
    ALTER TABLE public.categories ADD CONSTRAINT categories_bitrix_id_key UNIQUE (bitrix_id);
  END IF;
END;
$constraint$;

DO $postcondition$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='categories' AND column_name='bitrix_id'
  ) THEN
    RAISE EXCEPTION 'Pós-condição falhou: categories.bitrix_id ainda não existe';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'categories_bitrix_id_key' AND conrelid = 'public.categories'::regclass
  ) THEN
    RAISE EXCEPTION 'Pós-condição falhou: constraint categories_bitrix_id_key ainda não existe';
  END IF;
END;
$postcondition$;
