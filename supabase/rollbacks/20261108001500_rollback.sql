-- Rollback de 20261108001500_reconcile_e2e_cleanup_audit.sql.
-- Só remove a tabela quando ela foi criada por esta migration. Se a tabela já
-- existia, preservar seus dados é mais seguro do que tentar desfazer colunas e
-- constraints compartilhadas com migrations históricas.

DO $rollback$
BEGIN
  IF to_regclass('public.e2e_cleanup_audit') IS NOT NULL
    AND obj_description('public.e2e_cleanup_audit'::regclass, 'pg_class') =
      'created_by=20261108001500_reconcile_e2e_cleanup_audit; append-only Edge cleanup audit'
  THEN
    IF EXISTS (SELECT 1 FROM public.e2e_cleanup_audit LIMIT 1) THEN
      RAISE EXCEPTION
        'rollback recusado: public.e2e_cleanup_audit contém dados que seriam perdidos';
    END IF;
    DROP TABLE public.e2e_cleanup_audit;
  END IF;
END
$rollback$;
