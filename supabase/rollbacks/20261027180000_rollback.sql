-- Rollback: 20261027180000_reactivate_generate_blurhashes_safe_schedule.sql
-- Desativa generate-blurhashes (estado anterior: inativo).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'generate-blurhashes'
  ) THEN
    RAISE EXCEPTION 'Rollback falhou: generate-blurhashes não encontrado';
  END IF;
END;
$$;

SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'generate-blurhashes'),
  active := false
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'generate-blurhashes' AND active = true
  ) THEN
    RAISE EXCEPTION 'Pós-rollback falhou: generate-blurhashes ainda está ativo';
  END IF;
END;
$$;
