-- P01: Adicionar autenticação ao cron image-dimensions-backfill
-- Achado: A-C01 (CRÍTICO)
-- NÃO APLICAR DIRETAMENTE — usar workflow db-apply-migration.yml
-- Rollback incluído na seção ROLLBACK abaixo.
--
-- PROBLEMA: O cron image-dimensions-backfill (jobid=235) chama
-- run-script via pg_net sem nenhum header de autenticação.
-- Comando atual:
--   SELECT net.http_post(
--     url := 'https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/run-script',
--     body := '{"script":"image-dimensions-worker"}'::jsonb
--   )
--
-- SOLUÇÃO: Adicionar header Authorization usando get_edge_function_secret()
-- para passar o CRON_SECRET à edge function.
--
-- PRÉ-REQUISITO: Confirmar que run-script valida o header Authorization.
-- Se não valida, implementar validação ANTES de aplicar esta migration.

-- === MIGRATION ===

-- Atualizar o job para incluir header de autorização
-- ATENÇÃO: Esta migration altera um cron job existente.
-- Verificar o jobid correto antes de aplicar:
--   SELECT jobid, jobname, command FROM cron.job WHERE jobname = 'image-dimensions-backfill';

/*
SELECT cron.alter_job(
  job_id := 235,  -- confirmar jobid com query acima
  command := $CMD$
    SELECT net.http_post(
      url := 'https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/run-script',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || get_edge_function_secret('CRON_SECRET')
      ),
      body := '{"script":"image-dimensions-worker"}'::jsonb
    )
  $CMD$
);
*/

-- === VERIFICAÇÃO PÓS-APLICAÇÃO ===
-- SELECT command FROM cron.job WHERE jobid = 235;
-- Confirmar que 'Authorization' aparece no command

-- === ROLLBACK ===
-- Restaurar comando original (sem auth):
/*
SELECT cron.alter_job(
  job_id := 235,
  command := $CMD$
    SELECT net.http_post(
      url := 'https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/run-script',
      body := '{"script":"image-dimensions-worker"}'::jsonb
    )
  $CMD$
);
*/
