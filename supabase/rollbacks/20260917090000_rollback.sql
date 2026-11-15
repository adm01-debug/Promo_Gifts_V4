-- Rollback de 20260917090000_e47_fix_schema_drift_cron_split.sql
-- Restaura o jobid=245 (schema-drift-check) ao command original com
-- 1 chamada de fn_cron_safe_run contendo os 2 statements internos.
-- Reintroduz o risco de savepoint acoplado descrito na migration E47.

-- GUARD: rollback de migration que AINDA NAO foi aplicada nao pode rodar.
-- Em 2026-11-15, 20260917090000 nao esta em supabase_migrations.schema_migrations
-- (a janela de 17/set tem so 20260917061500 no ledger) e os jobs de cron em
-- producao seguem no estado PRE-migration. Sem esta guarda, rodar o arquivo
-- aplicaria "rollback" sobre um estado que nunca mudou.
DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20260917090000'
  ) THEN
    RAISE EXCEPTION
      'rollback abortado: a migration 20260917090000 nao esta aplicada neste banco; nao ha o que desfazer';
  END IF;
END
$guard$;

SELECT cron.alter_job(245, command := $cmd$
    SELECT public.fn_cron_safe_run(
      25::bigint,
      $$
        SELECT public.fn_check_schema_signature_drift();
        SELECT public.fn_sync_local_drift_to_schema_drift_log();
      $$,
      30000,
      'schema-drift-local-4x'
    );
  $cmd$
);
