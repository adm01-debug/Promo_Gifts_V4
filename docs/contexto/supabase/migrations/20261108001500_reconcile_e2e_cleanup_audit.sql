-- Migration: 20261108001500_reconcile_e2e_cleanup_audit
-- Rollback: DROP TABLE IF EXISTS public.e2e_cleanup_audit;

-- Reconcilia o drift em que o ledger registra as migrations históricas do
-- e2e_cleanup_audit, mas a tabela não existe no projeto canônico.
--
-- As colunas totals/total_ms e os status legados ficam temporariamente
-- disponíveis para zero downtime com a Edge Function v300. A versão nova
-- dual-write esses pares enquanto consumidores operacionais migram para os
-- nomes canônicos deleted_by_table/duration_ms.

DO $migration$
BEGIN
  IF to_regclass('public.e2e_cleanup_audit') IS NULL THEN
    EXECUTE $ddl$
      CREATE TABLE public.e2e_cleanup_audit ( -- soft-delete-exempt: auditoria append-only de limpeza E2E
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text,
        user_id uuid,
        seller_id uuid,
        seller_scope text,
        name_filter_prefix text,
        dry_run boolean NOT NULL DEFAULT true,
        status text NOT NULL,
        reason text,
        ip text,
        user_agent text,
        total_deleted integer NOT NULL DEFAULT 0,
        totals jsonb NOT NULL DEFAULT '{}'::jsonb,
        total_ms integer NOT NULL DEFAULT 0,
        deleted_by_table jsonb NOT NULL DEFAULT '{}'::jsonb,
        errors jsonb NOT NULL DEFAULT '{}'::jsonb,
        duration_ms integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    $ddl$;
    COMMENT ON TABLE public.e2e_cleanup_audit IS
      'created_by=20261108001500_reconcile_e2e_cleanup_audit; append-only Edge cleanup audit';
  END IF;
END
$migration$

ALTER TABLE public.e2e_cleanup_audit
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS seller_id uuid,
  ADD COLUMN IF NOT EXISTS seller_scope text,
  ADD COLUMN IF NOT EXISTS name_filter_prefix text,
  ADD COLUMN IF NOT EXISTS dry_run boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS ip text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS total_deleted integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS total_ms integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_by_table jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS errors jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS duration_ms integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()

-- Falhas de autenticação acontecem antes de o body ser confiável; email nulo
-- distingue esse caso de uma string vazia que poderia parecer um valor real.
ALTER TABLE public.e2e_cleanup_audit
  ALTER COLUMN email DROP NOT NULL

DO $migration$
DECLARE
  status_attnum smallint;
  constraint_row record;
BEGIN
  SELECT attnum::smallint
  INTO status_attnum
  FROM pg_attribute
  WHERE attrelid = 'public.e2e_cleanup_audit'::regclass
    AND attname = 'status'
    AND NOT attisdropped;

  FOR constraint_row IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.e2e_cleanup_audit'::regclass
      AND contype = 'c'
      AND conkey = ARRAY[status_attnum]::smallint[]
  LOOP
    EXECUTE format(
      'ALTER TABLE public.e2e_cleanup_audit DROP CONSTRAINT %I',
      constraint_row.conname
    );
  END LOOP;

  UPDATE public.e2e_cleanup_audit
  SET status = CASE
    WHEN status IS NULL THEN 'error'
    ELSE 'invalid'
  END
  WHERE status IS NULL
    OR status NOT IN (
      'started', 'success', 'partial_error', 'auth_failed',
      'ok', 'error', 'rate_limited', 'unauthorized', 'forbidden', 'not_found', 'invalid'
    );

  ALTER TABLE public.e2e_cleanup_audit ALTER COLUMN status SET NOT NULL;
END
$migration$

ALTER TABLE public.e2e_cleanup_audit
  ADD CONSTRAINT e2e_cleanup_audit_status_check
  CHECK (status IN (
    'started', 'success', 'partial_error', 'auth_failed',
    'ok', 'error', 'rate_limited', 'unauthorized', 'forbidden', 'not_found', 'invalid'
  ))

-- Reconcilia ambos os nomes sem apagar o valor mais informativo.
UPDATE public.e2e_cleanup_audit
SET deleted_by_table = totals
WHERE deleted_by_table = '{}'::jsonb
  AND totals <> '{}'::jsonb

UPDATE public.e2e_cleanup_audit
SET totals = deleted_by_table
WHERE totals = '{}'::jsonb
  AND deleted_by_table <> '{}'::jsonb

UPDATE public.e2e_cleanup_audit
SET duration_ms = total_ms
WHERE duration_ms = 0
  AND total_ms <> 0

UPDATE public.e2e_cleanup_audit
SET total_ms = duration_ms
WHERE total_ms = 0
  AND duration_ms <> 0

CREATE INDEX IF NOT EXISTS idx_e2e_cleanup_audit_created_at
  ON public.e2e_cleanup_audit (created_at DESC)

CREATE INDEX IF NOT EXISTS idx_e2e_cleanup_audit_email
  ON public.e2e_cleanup_audit (email, created_at DESC)

CREATE INDEX IF NOT EXISTS idx_e2e_cleanup_audit_status
  ON public.e2e_cleanup_audit (status, created_at DESC)

CREATE INDEX IF NOT EXISTS idx_e2e_cleanup_audit_user_id
  ON public.e2e_cleanup_audit (user_id, created_at DESC)
  WHERE user_id IS NOT NULL

CREATE INDEX IF NOT EXISTS idx_e2e_cleanup_audit_seller_id
  ON public.e2e_cleanup_audit (seller_id, created_at DESC)
  WHERE seller_id IS NOT NULL

ALTER TABLE public.e2e_cleanup_audit ENABLE ROW LEVEL SECURITY

DROP POLICY IF EXISTS "admins_select_e2e_cleanup_audit" ON public.e2e_cleanup_audit

CREATE POLICY "admins_select_e2e_cleanup_audit"
  ON public.e2e_cleanup_audit
  FOR SELECT
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'))

REVOKE ALL ON TABLE public.e2e_cleanup_audit FROM PUBLIC, anon, authenticated

GRANT SELECT ON TABLE public.e2e_cleanup_audit TO authenticated

GRANT SELECT, INSERT, UPDATE ON TABLE public.e2e_cleanup_audit TO service_role
