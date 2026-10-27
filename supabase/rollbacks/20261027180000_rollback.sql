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
  job_id   := (SELECT jobid FROM cron.job WHERE jobname = 'generate-blurhashes'),
  schedule := '1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53,55,57,59 * * * *',
  active   := false
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'generate-blurhashes' AND active = true
  ) THEN
    RAISE EXCEPTION 'Pós-rollback falhou: generate-blurhashes ainda está ativo';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'generate-blurhashes'
      AND schedule = '1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53,55,57,59 * * * *'
  ) THEN
    RAISE EXCEPTION 'Pós-rollback falhou: generate-blurhashes não restaurou schedule original';
  END IF;
END;
$$;
