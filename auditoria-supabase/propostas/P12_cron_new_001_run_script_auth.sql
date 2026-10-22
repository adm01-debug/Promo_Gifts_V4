-- ============================================================
-- PROPOSTA P12 — CRON-NEW-001: Adicionar auth header em backfill-image-dimensions
-- Severidade: ALTO
-- Achado: CRON-NEW-001
-- Status: NÃO APLICADA — somente para revisão e aprovação do PO
-- ============================================================
-- PROBLEMA:
--   O job de cron `backfill-image-dimensions` chama
--   `/functions/v1/run-script` via net.http_post sem header
--   Authorization nem x-cron-secret. A edge function `run-script`
--   tem verify_jwt=false, permitindo execução não autenticada.
--
-- EVIDÊNCIA (somente leitura, confirmada 2026-10-22):
--   SELECT jobname, LEFT(command,400) FROM cron.job
--   WHERE command ILIKE '%run-script%';
--   → command sem 'Authorization' nem 'cron-secret'
--
-- SOLUÇÃO:
--   Atualizar o comando do job para incluir o header x-cron-secret
--   lido do Vault (padrão já usado por outros jobs neste projeto).
-- ============================================================

-- === VERIFICAÇÃO PRÉ-APLICAÇÃO ===
/*
SELECT jobid, jobname, LEFT(command, 600) AS cmd
FROM cron.job WHERE jobname ILIKE '%image-dimensions%';
-- Confirmar que NÃO tem header de autenticação
*/

-- === APLICAÇÃO ===
-- NÃO EXECUTAR DIRETAMENTE — usar db-apply-migration.yml
/*
-- Usar cron.alter_job (não execute_sql direto — REGRA #8 corolário E056)
-- Este UPDATE deve ser feito como migration SQL no PR, não via MCP

UPDATE cron.job
SET command = $cmd$
SELECT net.http_post(
  url := (SELECT value FROM vault.decrypted_secrets WHERE name='SUPABASE_URL') || '/functions/v1/run-script',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='CRON_SECRET')
  ),
  body := '{"script":"backfill-image-dimensions"}'::jsonb
)::void
$cmd$
WHERE jobname = 'backfill-image-dimensions';
*/

-- === ROLLBACK ===
/*
-- Restaurar o comando original (salvar antes da alteração)
UPDATE cron.job
SET command = '<COMMAND_ORIGINAL>'
WHERE jobname = 'backfill-image-dimensions';
*/

-- === RISCO DE REGRESSÃO ===
-- BAIXO: A edge function run-script precisa validar o x-cron-secret
-- se ainda não valida. Verificar o código antes de aplicar.

-- === ESFORÇO ===
-- Pequeno (1 UPDATE cron.job + verificação de run-script)
