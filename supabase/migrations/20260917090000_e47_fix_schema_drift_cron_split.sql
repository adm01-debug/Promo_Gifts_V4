-- E47 — Separa o cron job schema-drift-check em 2 chamadas de
-- fn_cron_safe_run (1 statement cada) em vez de 1 chamada com 2 statements.
-- Plano: docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md (E47)
-- Ver docs/E47_SCHEMA_DRIFT_DETECTOR_2026-09-17.md para a investigação completa.
--
-- Hoje (jobid 245) o command chama fn_cron_safe_run UMA vez com um p_sql de
-- 2 statements (fn_check_schema_signature_drift(); depois
-- fn_sync_local_drift_to_schema_drift_log();). Blocos EXCEPTION do PL/pgSQL
-- funcionam como um SAVEPOINT implícito: se a 2ª statement falhar, o
-- rollback desfaz também a gravação da 1ª (o check real), e
-- fn_cron_safe_run nunca relança a exceção — cron.job_run_details.status
-- continuaria mostrando 'succeeded'. Separar em 2 chamadas sequenciais e
-- independentes de fn_cron_safe_run isola o savepoint de cada uma: se a
-- bridge (2ª) falhar depois, a gravação do check (1ª) já está fechada e
-- sobrevive. Reaproveita a mesma chave de advisory lock (25) para as duas —
-- pg_try_advisory_xact_lock é reentrante para a mesma sessão/transação, e
-- as duas chamadas rodam em sequência, nunca em paralelo, então não há
-- risco de autobloqueio nem de colisão com outro job usando a chave 25.
--
-- Nenhuma função é alterada nesta migration — só o command do cron job.
--
-- [REQUER-PO] — não aplicado nesta revisão. Caminho de aplicação: E15
-- (.github/workflows/db-apply-migration.yml), nunca supabase db push.

DO $precondition$
DECLARE
  v_command text;
BEGIN
  SELECT command INTO v_command FROM cron.job WHERE jobid = 245 AND jobname = 'schema-drift-check';

  IF v_command IS NULL THEN
    RAISE EXCEPTION 'Precondição falhou: cron.job jobid=245 (schema-drift-check) não existe com esse nome — investigar antes de prosseguir';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobid = 245 AND active AND schedule = '11 2,8,14,20 * * *') THEN
    RAISE EXCEPTION 'Precondição falhou: schema-drift-check não está active=true com schedule=''11 2,8,14,20 * * *'' — premissa mudou, investigar antes de prosseguir';
  END IF;

  IF v_command NOT LIKE '%fn_check_schema_signature_drift()%'
     OR v_command NOT LIKE '%fn_sync_local_drift_to_schema_drift_log()%'
     OR (length(v_command) - length(replace(v_command, 'fn_cron_safe_run(', ''))) / length('fn_cron_safe_run(') <> 1 THEN
    RAISE EXCEPTION 'Precondição falhou: command do jobid=245 não bate com o padrão esperado (1 chamada de fn_cron_safe_run envolvendo as 2 funções) — alguém já mudou isso, investigar antes de prosseguir';
  END IF;

  IF to_regprocedure('public.fn_cron_safe_run(bigint, text, integer, text)') IS NULL THEN
    RAISE EXCEPTION 'Precondição falhou: fn_cron_safe_run(bigint, text, integer, text) não existe — investigar antes de prosseguir';
  END IF;
  IF to_regprocedure('public.fn_check_schema_signature_drift()') IS NULL THEN
    RAISE EXCEPTION 'Precondição falhou: fn_check_schema_signature_drift() não existe — investigar antes de prosseguir';
  END IF;
  IF to_regprocedure('public.fn_sync_local_drift_to_schema_drift_log()') IS NULL THEN
    RAISE EXCEPTION 'Precondição falhou: fn_sync_local_drift_to_schema_drift_log() não existe — investigar antes de prosseguir';
  END IF;
END;
$precondition$;

SELECT cron.alter_job(
  245,
  command := $cmd$
    SELECT public.fn_cron_safe_run(25::bigint,
      $$SELECT public.fn_check_schema_signature_drift();$$, 15000, 'schema-drift-local-4x');
    SELECT public.fn_cron_safe_run(25::bigint,
      $$SELECT public.fn_sync_local_drift_to_schema_drift_log();$$, 15000, 'schema-drift-bridge-4x');
  $cmd$
);

DO $postcondition$
DECLARE
  v_command text;
  v_calls int;
BEGIN
  SELECT command INTO v_command FROM cron.job WHERE jobid = 245;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobid = 245 AND active AND schedule = '11 2,8,14,20 * * *') THEN
    RAISE EXCEPTION 'Pós-condição falhou: schema-drift-check não ficou active=true com o schedule original';
  END IF;

  v_calls := (length(v_command) - length(replace(v_command, 'fn_cron_safe_run(', ''))) / length('fn_cron_safe_run(');
  IF v_calls <> 2 THEN
    RAISE EXCEPTION 'Pós-condição falhou: esperava 2 chamadas de fn_cron_safe_run no novo command, achou %', v_calls;
  END IF;

  IF v_command NOT LIKE '%fn_check_schema_signature_drift();$$%'
     OR v_command NOT LIKE '%fn_sync_local_drift_to_schema_drift_log();$$%' THEN
    RAISE EXCEPTION 'Pós-condição falhou: novo command não contém as 2 funções esperadas, cada uma como statement isolado';
  END IF;
END;
$postcondition$;

-- Reversão: volta ao command original (1 chamada de fn_cron_safe_run com os
-- 2 statements dentro do mesmo p_sql — reintroduz o risco descrito acima,
-- só use para reverter se a separação causar algum problema inesperado):
--
-- SELECT cron.alter_job(245, command := $cmd$
--     SELECT public.fn_cron_safe_run(
--       25::bigint,
--       $$
--         SELECT public.fn_check_schema_signature_drift();
--         SELECT public.fn_sync_local_drift_to_schema_drift_log();
--       $$,
--       30000,
--       'schema-drift-local-4x'
--     );
--   $cmd$
-- );
